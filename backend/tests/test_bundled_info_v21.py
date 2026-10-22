import importlib.util
import sys
import tempfile
import unittest
import json
import zipfile
from pathlib import Path

script=Path(__file__).resolve().parents[1]/'scripts'/'publish_course_packages.py'
spec=importlib.util.spec_from_file_location('lunivo_overlay_publisher',script)
pub=importlib.util.module_from_spec(spec)
sys.modules[spec.name]=pub
spec.loader.exec_module(pub)

class BundledInfoTests(unittest.TestCase):
    def test_agua_info_package_and_image(self):
        with tempfile.TemporaryDirectory() as tmp:
            source=Path(__file__).resolve().parents[3] / 'curso-lunivo-info-acqua-v1.zip'
            # Files are in a separate content ZIP; tests use a minimal self-contained fixture.
            bundle={
                'version':1,'revision':1,'lessonId':'it-a1-01',
                'entries':[{'beforeExerciseId':'q01','exercise':{
                    'type':'info','id':'q7001','instruction':'Vocabulário','prompt':'Bevi acqua?',
                    'explanation':'Acqua significa água.', 'category':'vocabulary',
                }}]
            }
            path=Path(tmp)/'curso-lunivo-test-info.zip'
            with zipfile.ZipFile(path,'w') as z:z.writestr('bundled-info.json',json.dumps(bundle))
            lid,doc,body,images=pub.read_info_package(path)
            self.assertEqual(lid,'it-a1-01')
            self.assertEqual(doc['entries'][0]['exercise']['prompt'],'Bevi acqua?')
            self.assertEqual(images,{})
    def test_disallows_question_replacement(self):
        with tempfile.TemporaryDirectory() as tmp:
            bundle={
                'version':1,'revision':1,'lessonId':'it-a1-01',
                'entries':[{'beforeExerciseId':'q01','exercise':{
                    'type':'info','id':'q01','instruction':'Vocabulário','prompt':'Água',
                    'explanation':'Água em italiano.'
                }}]
            }
            path=Path(tmp)/'curso-lunivo-test-info.zip'
            with zipfile.ZipFile(path,'w') as z:z.writestr('bundled-info.json',json.dumps(bundle))
            with self.assertRaises(pub.PublicationError):pub.read_info_package(path)
    def test_disallows_bad_anchors(self):
        with tempfile.TemporaryDirectory() as tmp:
            bundle={
                'version':1,'revision':1,'lessonId':'it-a1-01',
                'entries':[{'beforeExerciseId':'q9999','exercise':{
                    'type':'info','id':'q7001','instruction':'Vocabulário','prompt':'Água',
                    'explanation':'Água em italiano.'
                }}]
            }
            path=Path(tmp)/'curso-lunivo-test-info.zip'
            with zipfile.ZipFile(path,'w') as z:z.writestr('bundled-info.json',json.dumps(bundle))
            with self.assertRaises(pub.PublicationError):pub.read_info_package(path)

if __name__=='__main__':unittest.main()
