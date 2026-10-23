import importlib.util
import io
import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

script=Path(__file__).resolve().parents[1]/'scripts'/'publish_course_packages.py'
spec=importlib.util.spec_from_file_location('lunivo_publisher_v26',script)
pub=importlib.util.module_from_spec(spec)
sys.modules[spec.name]=pub
spec.loader.exec_module(pub)

class RemoteInfosV26(unittest.TestCase):
    def package(self, entries):
        temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup)
        path=Path(temp.name)/'curso-lunivo-info-apresentacoes-v26.zip'
        with zipfile.ZipFile(path,'w') as z:
            z.writestr('bundled-info.json',json.dumps({'version':1,'revision':1,'lessonId':'it-a1-04','entries':entries},ensure_ascii=False))
        return path

    def entry(self,anchor='__first__',kind='beforeExerciseId'):
        return {kind:anchor,'exercise':{'type':'info','id':'q7604','instruction':'Cumprimentos e nomes',
          'prompt':'Como se apresentar na Itália?', 'explanation':'Mi chiamo significa me chamo.', 'category':'culture'}}

    def test_accepts_remote_lesson_start_without_image(self):
        lid,obj,raw,images=pub.read_info_package(self.package([self.entry()]))
        self.assertEqual(lid,'it-a1-04')
        self.assertEqual(obj['entries'][0]['beforeExerciseId'],'__first__')
        self.assertEqual(images,{})

    def test_rejects_start_after_exercise(self):
        with self.assertRaises(pub.PublicationError):pub.read_info_package(self.package([self.entry(kind='afterExerciseId')]))

    def test_rejects_broken_info_type(self):
        bad=self.entry();bad['exercise']['type']='choice'
        with self.assertRaises(pub.PublicationError):pub.read_info_package(self.package([bad]))

    def test_publisher_checks_remote_lesson_exists_before_writing(self):
        lid,doc,blob,images=pub.read_info_package(self.package([self.entry()]))
        with self.assertRaises(pub.PublicationError):pub.publish_infos(object(),[(lid,doc,blob,images)],[])

    def test_publisher_preserves_existing_remote_unit(self):
        lid,doc,blob,images=pub.read_info_package(self.package([self.entry()]))
        summary={'id':'it-a1-u02','language':'it','level':'A1','order':2,'revision':1,'title':'Apresentações',
          'subtitle':'Nomes','lessons':[{'id':'it-a1-04','title':'Meu nome','subtitle':'Nomes','exerciseCount':1}]}
        lesson={'id':'it-a1-04','exercises':[{'id':'q19','type':'choice','prompt':'Come ti chiami?'}]}
        saved={pub.file_key(summary):json.dumps({'version':1,'unitId':'it-a1-u02','revision':1,'lessons':[lesson]}).encode()}
        class FakeClient:
            def __init__(self):self.writes=[]
            def put_object(self,**kw):self.writes.append(kw)
        client=FakeClient()
        before=pub.get_object
        def get_object(_client,key):return saved.get(key)
        pub.get_object=get_object
        try:pub.publish_infos(client,[(lid,doc,blob,images)],[summary])
        finally:pub.get_object=before
        self.assertEqual(len(client.writes),1)
        self.assertEqual(client.writes[0]['Key'],pub.INFO_KEY.format(lesson_id='it-a1-04'))
        self.assertNotIn(pub.file_key(summary),[item['Key'] for item in client.writes])

if __name__=='__main__':unittest.main()
