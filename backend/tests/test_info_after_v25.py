import importlib.util
import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

script = Path(__file__).resolve().parents[1] / 'scripts' / 'publish_course_packages.py'
spec = importlib.util.spec_from_file_location('lunivo_course_publisher_v25', script)
pub = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = pub
spec.loader.exec_module(pub)

class InfoAfterTests(unittest.TestCase):
    def package(self, entries):
        td = tempfile.TemporaryDirectory()
        self.addCleanup(td.cleanup)
        path = Path(td.name) / 'curso-lunivo-test-essere.zip'
        doc = {'version':1,'revision':2,'lessonId':'it-a1-02','entries':entries}
        with zipfile.ZipFile(path,'w') as z:
            z.writestr('bundled-info.json',json.dumps(doc,ensure_ascii=False))
        return path

    def info(self, eid):
        return {'type':'info','id':eid,'category':'grammar',
                'instruction':'Gramática','prompt':'Essere: ser ou estar?',
                'explanation':'Essere significa ser e, em certos contextos, estar.'}

    def test_accepts_end_of_lesson_and_preserves_first_info(self):
        entries=[{'beforeExerciseId':'q07','exercise':self.info('q7201')},
                 {'afterExerciseId':'q10','exercise':self.info('q7202')}]
        lid,doc,serialized,images=pub.read_info_package(self.package(entries))
        self.assertEqual(lid,'it-a1-02')
        self.assertEqual(doc['revision'],2)
        self.assertEqual(doc['entries'][1]['afterExerciseId'],'q10')
        self.assertEqual(images,{})
        self.assertEqual(json.loads(serialized),doc)

    def test_rejects_both_or_missing_anchors(self):
        for bad in ({'beforeExerciseId':'q07','afterExerciseId':'q10'},
                    {}, {'afterExerciseId':'q9999'}):
            with self.subTest(bad=bad):
                with self.assertRaises(pub.PublicationError):
                    pub.read_info_package(self.package([{**bad,'exercise':self.info('q7202')}]))

if __name__ == '__main__':
    unittest.main()
