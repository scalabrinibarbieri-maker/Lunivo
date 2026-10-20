import importlib.util
import io
import json
import sys
import unittest
import zipfile
from pathlib import Path
from tempfile import TemporaryDirectory

MOD = Path(__file__).resolve().parents[1] / 'scripts' / 'publish_audio_packages.py'
spec = importlib.util.spec_from_file_location('publish_audio_packages', MOD)
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)

ID3 = b'ID3' + b'\x03\x00\x00\x00\x00\x00\x05' + b'FAKEAUDIO'
CLIP = {'id':'it-a1-grazie-v1', 'exerciseId':'q03', 'text':'Grazie',
        'locale':'it-IT', 'storageKey':'it-IT/a1/it-a1-grazie-v1.mp3'}

class TestPublisher(unittest.TestCase):
    def make_zip(self, extra=None, clip=None):
        temp = TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        path = Path(temp.name) / 'audio-lunivo-lote1.zip'
        with zipfile.ZipFile(path, 'w') as z:
            obj = clip or CLIP
            z.writestr('manifest-v1-part.json', json.dumps({'version':1,'clips':[obj]}))
            z.writestr(obj['storageKey'], ID3)
            if extra:
                z.writestr(extra, b'xxx')
        return path

    def test_reads_expected_zip(self):
        clips = module.read_package(self.make_zip())
        self.assertEqual(clips[0].clip['sizeBytes'], len(ID3))
        self.assertEqual(clips[0].clip['exerciseId'], 'q03')

    def test_rejects_unexpected_extra_file(self):
        with self.assertRaises(module.PublicationError):
            module.read_package(self.make_zip(extra='../unexpected'))

    def test_embedded_lessons_cannot_be_overwritten(self):
        with self.assertRaises(module.PublicationError):
            module.read_package(self.make_zip(clip={**CLIP,'exerciseId':'q01'}))

    def test_rejects_different_clip_same_exercise(self):
        old = {**CLIP, 'sizeBytes': len(ID3)}
        new = module.AudioRecord({**old,'id':'it-a1-altro-v1','storageKey':'it-IT/a1/it-a1-altro-v1.mp3'}, ID3)
        with self.assertRaises(module.PublicationError):
            module.merge_records([old],[new])

    def test_merges_and_preserves_previous_clips(self):
        old = {**CLIP, 'sizeBytes': len(ID3)}
        nextclip = {**old,'exerciseId':'q04','id':'it-a1-favore-v1','storageKey':'it-IT/a1/it-a1-favore-v1.mp3'}
        combined = module.merge_records([old],[module.AudioRecord(nextclip, ID3)])
        self.assertEqual(len(combined),2)
        self.assertEqual(combined[0],old)

    def test_reupload_identical_metadata_is_idempotent(self):
        old = {**CLIP, 'sizeBytes': len(ID3)}
        self.assertEqual(module.merge_records([old],[module.AudioRecord(old, ID3)]),[old])

    def test_invalid_mp3(self):
        self.assertFalse(module.valid_mp3(b'HELLO'))
        self.assertTrue(module.valid_mp3(ID3))

    def test_manifest_serializes_under_size(self):
        old = {**CLIP,'sizeBytes':len(ID3)}
        self.assertEqual(module.decode_manifest(module.manifest_bytes([old]), incoming=False), [old])

if __name__ == '__main__': unittest.main()
