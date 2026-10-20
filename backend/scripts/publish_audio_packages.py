#!/usr/bin/env python3
"""Publicador seguro e idempotente de lotes de pronúncia Lunivo para Cloudflare R2.

Entrada: ZIP audio-lunivo-*.zip com manifest-v1-part.json e MP3s nos caminhos
storageKey. Salva todos os áudios antes de atualizar manifest-v1.json.

O bucket é privado. Somente o Worker entrega GETs para o aplicativo.
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

MAX_PACKAGE_BYTES = 32 * 1024 * 1024
MAX_AUDIO_BYTES = 2 * 1024 * 1024
MAX_MANIFEST_BYTES = 64 * 1024
MAX_CLIPS = 300  # Limite atual do cliente; migrar a catálogo paginado futuramente.
MAX_NEW_FILES = 50
BATCH_FILE = 'manifest-v1-part.json'
MANIFEST_KEY = 'manifest-v1.json'
VALID_ID = re.compile(r'^[a-z0-9-]{3,100}$')
VALID_EXERCISE = re.compile(r'^q[0-9]{2,6}$')
VALID_LOCALE = re.compile(r'^[a-z]{2}-[A-Z]{2}$')
VALID_PACKAGE = re.compile(r'^audio-lunivo-[a-zA-Z0-9._-]+\.zip$')


class PublicationError(ValueError):
    pass


@dataclass(frozen=True)
class AudioRecord:
    clip: dict[str, Any]
    content: bytes


def validate_clip(raw: Any, *, incoming: bool) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise PublicationError('Entrada do catálogo não é um objeto.')
    fields = {'id', 'exerciseId', 'text', 'locale', 'storageKey'}
    required = fields if incoming else fields | {'sizeBytes'}
    if set(raw) != required:
        raise PublicationError(f'Campos inválidos no registro de áudio: {sorted(set(raw) ^ required)}')
    clip_id = raw['id']
    exercise_id = raw['exerciseId']
    text = raw['text']
    locale = raw['locale']
    key = raw['storageKey']
    if not isinstance(clip_id, str) or not VALID_ID.fullmatch(clip_id):
        raise PublicationError('ID de áudio inválido.')
    if not isinstance(exercise_id, str) or not VALID_EXERCISE.fullmatch(exercise_id) or exercise_id in {'q01', 'q02'}:
        raise PublicationError('Exercício inválido ou reservado para áudio embutido.')
    if not isinstance(text, str) or not 1 <= len(text) <= 160 or any(ord(c) < 32 for c in text):
        raise PublicationError('Texto de pronúncia inválido.')
    if not isinstance(locale, str) or not VALID_LOCALE.fullmatch(locale):
        raise PublicationError('Código de idioma inválido.')
    if not isinstance(key, str) or not re.fullmatch(re.escape(locale) + r'/[a-z0-9-]{1,32}/' + re.escape(clip_id) + r'\.mp3', key):
        raise PublicationError('Caminho R2 inválido para o áudio.')
    item = dict(raw)
    if not incoming:
        size = raw['sizeBytes']
        if type(size) is not int or not 1 <= size <= MAX_AUDIO_BYTES:
            raise PublicationError('Tamanho registrado inválido.')
    return item


def decode_manifest(raw: bytes, *, incoming: bool) -> list[dict[str, Any]]:
    if len(raw) > MAX_MANIFEST_BYTES:
        raise PublicationError('Catálogo ultrapassa 64 KB.')
    try:
        doc = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise PublicationError('Arquivo JSON do catálogo inválido.') from exc
    if not isinstance(doc, dict) or set(doc) != {'version', 'clips'} or doc['version'] != 1 or not isinstance(doc['clips'], list):
        raise PublicationError('Manifesto precisa ter version=1 e clips=[...].')
    if len(doc['clips']) > MAX_CLIPS:
        raise PublicationError('Catálogo excede o limite atual de 300 áudios.')
    clips = [validate_clip(row, incoming=incoming) for row in doc['clips']]
    ids = [row['id'] for row in clips]
    exercises = [row['exerciseId'] for row in clips]
    if len(set(ids)) != len(ids) or len(set(exercises)) != len(exercises):
        raise PublicationError('IDs ou exercícios duplicados no catálogo.')
    return clips


def valid_mp3(data: bytes) -> bool:
    if len(data) < 4 or len(data) > MAX_AUDIO_BYTES:
        return False
    # ID3v2 ou sync-frame MPEG (sem exigir metadados em arquivos curtos).
    if data.startswith(b'ID3') and len(data) >= 10:
        return True
    return data[0] == 0xFF and (data[1] & 0xE0) == 0xE0


def read_package(path: Path) -> list[AudioRecord]:
    if not VALID_PACKAGE.fullmatch(path.name):
        raise PublicationError('Pacote deve seguir audio-lunivo-*.zip.')
    if not path.is_file() or path.stat().st_size > MAX_PACKAGE_BYTES:
        raise PublicationError('Pacote ausente ou maior que 32 MB.')
    try:
        with zipfile.ZipFile(path) as zipped:
            files = [f for f in zipped.infolist() if not f.is_dir()]
            if len(files) < 2 or len(files) > MAX_NEW_FILES + 1:
                raise PublicationError('Pacote precisa de JSON e entre 1 e 50 MP3s.')
            names = [f.filename for f in files]
            if len(names) != len(set(names)) or BATCH_FILE not in names:
                raise PublicationError('Manifesto ausente ou entradas duplicadas no ZIP.')
            total = 0
            for f in files:
                if f.flag_bits & 0x01 or (f.external_attr >> 16) & 0o170000 not in (0, 0o100000):
                    raise PublicationError('ZIP criptografado ou com link/arquivo especial.')
                if f.filename.startswith('/') or '\\' in f.filename or any(x in ('', '.', '..') for x in f.filename.split('/')):
                    raise PublicationError('Caminho inseguro dentro do ZIP.')
                total += f.file_size
                if total > MAX_PACKAGE_BYTES:
                    raise PublicationError('Conteúdo do ZIP excede o limite.')
            raw_clips = decode_manifest(zipped.read(BATCH_FILE), incoming=True)
            if not raw_clips or len(raw_clips) > MAX_NEW_FILES:
                raise PublicationError('Lote precisa de 1 a 50 áudios.')
            expected = {clip['storageKey'] for clip in raw_clips} | {BATCH_FILE}
            if set(names) != expected:
                raise PublicationError('Os MP3s do ZIP não correspondem ao manifesto.')
            result = []
            for clip in raw_clips:
                data = zipped.read(clip['storageKey'])
                if not valid_mp3(data):
                    raise PublicationError(f'MP3 inválido ou grande demais: {clip["id"]}')
                result.append(AudioRecord({**clip, 'sizeBytes': len(data)}, data))
            return result
    except zipfile.BadZipFile as exc:
        raise PublicationError('ZIP corrompido.') from exc


def merge_records(current: list[dict[str, Any]], records: list[AudioRecord]) -> list[dict[str, Any]]:
    existing = {x['id']: x for x in current}
    by_exercise = {x['exerciseId']: x['id'] for x in current}
    for record in records:
        clip = record.clip
        old = existing.get(clip['id'])
        if old is not None:
            if old != clip:
                raise PublicationError(f'ID reutilizado com outra gravação: {clip["id"]}. Use um novo ID -v2.')
            continue  # Reenvio idempotente do mesmo arquivo (checado no R2 abaixo).
        if clip['exerciseId'] in by_exercise:
            raise PublicationError(f'Exercício já possui áudio remoto: {clip["exerciseId"]}. Atualização de voz requer revisão específica.')
        if any(x['storageKey'] == clip['storageKey'] for x in existing.values()):
            raise PublicationError('Caminho R2 já utilizado por outro áudio.')
        existing[clip['id']] = clip
        by_exercise[clip['exerciseId']] = clip['id']
    if len(existing) > MAX_CLIPS:
        raise PublicationError('Total supera 300 clipes: implementar catálogo paginado antes de continuar.')
    return list(existing.values())


def manifest_bytes(clips: list[dict[str, Any]]) -> bytes:
    data = (json.dumps({'version': 1, 'clips': clips}, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8')
    if len(data) > MAX_MANIFEST_BYTES:
        raise PublicationError('Manifesto final ultrapassa 64 KB.')
    return data


def get_object_or_none(client: Any, bucket: str, key: str) -> bytes | None:
    from botocore.exceptions import ClientError
    try:
        response = client.get_object(Bucket=bucket, Key=key)
    except ClientError as exc:
        code = exc.response.get('Error', {}).get('Code')
        if code in ('NoSuchKey', '404', 'NotFound'):
            return None
        raise
    return response['Body'].read(MAX_AUDIO_BYTES + 1 if key != MANIFEST_KEY else MAX_MANIFEST_BYTES + 1)


def publish(client: Any, bucket: str, paths: list[Path]) -> tuple[int, int]:
    if not paths:
        raise PublicationError('Nenhum pacote de áudio para publicar.')
    records = [item for p in paths for item in read_package(p)]
    if len(records) > 75:
        raise PublicationError('Publicação simultânea limitada a 75 MP3s.')
    raw_manifest = get_object_or_none(client, bucket, MANIFEST_KEY)
    current = decode_manifest(raw_manifest, incoming=False) if raw_manifest is not None else []
    future = merge_records(current, records)
    data = manifest_bytes(future)
    keys = set()
    new_objects = 0
    for item in records:
        key = item.clip['storageKey']
        if key in keys:
            raise PublicationError(f'Mesmo MP3 repetido no lote: {key}')
        keys.add(key)
    # Todas as colisões são examinadas antes de publicar qualquer objeto.
    for item in records:
        remote = get_object_or_none(client, bucket, item.clip['storageKey'])
        if remote is not None and remote != item.content:
            raise PublicationError('Existe no R2 um MP3 com conteúdo diferente para ' + item.clip['id'])
    for item in records:
        if get_object_or_none(client, bucket, item.clip['storageKey']) is None:
            client.put_object(Bucket=bucket, Key=item.clip['storageKey'], Body=item.content, ContentType='audio/mpeg', CacheControl='public, max-age=31536000, immutable')
            new_objects += 1
            print('[Lunivo] MP3 enviado:', item.clip['id'], 'bytes:', len(item.content))
        else:
            print('[Lunivo] MP3 idêntico já publicado:', item.clip['id'])
    # Etapa final atômica na visão do cliente: manifesto publicado por último.
    if raw_manifest != data:
        client.put_object(Bucket=bucket, Key=MANIFEST_KEY, Body=data, ContentType='application/json; charset=utf-8', CacheControl='public, max-age=300')
    print(f'[Lunivo] Catálogo publicado: {len(future)} clipes, {new_objects} objetos novos.')
    return (len(future), new_objects)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('packages', nargs='*', type=Path)
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args()
    key = os.environ.get('LUNIVO_R2_ACCESS_KEY_ID', '')
    secret = os.environ.get('LUNIVO_R2_SECRET_ACCESS_KEY', '')
    account = os.environ.get('LUNIVO_R2_ACCOUNT_ID', '')
    if not key or not secret or not re.fullmatch(r'[a-f0-9]{32}', account):
        raise PublicationError('Credenciais R2 incompletas no GitHub Actions.')
    import boto3
    client = boto3.client('s3', endpoint_url=f'https://{account}.r2.cloudflarestorage.com',
        aws_access_key_id=key, aws_secret_access_key=secret, region_name='auto')
    bucket = 'lunivo-audios'
    if args.check_only:
        client.list_objects_v2(Bucket=bucket, MaxKeys=1)
        print('[Lunivo] Conexão R2 verificada; bucket disponível.')
        return
    publish(client, bucket, args.packages)


if __name__ == '__main__':
    try:
        main()
    except PublicationError as exc:
        print('ERRO LUNIVO: ' + str(exc), file=sys.stderr)
        raise SystemExit(1) from exc
