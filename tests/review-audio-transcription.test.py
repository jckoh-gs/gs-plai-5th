"""Independent validation and pre-execution rejection tests; never runs ASR."""
import ast
import contextlib
import copy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[1] / 'scripts/media/transcribe-audio.py'
spec = importlib.util.spec_from_file_location('reviewed_audio', SOURCE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def valid(end=10000):
    return {'result': {'language': 'ko'}, 'params': {'language': 'ko', 'translate': False},
            'transcription': [{'offsets': {'from': 0, 'to': end}, 'text': '가상 발전소를 확인합니다.'}]}

class TranscriptValidation(unittest.TestCase):
    def test_valid_korean_actual_pcm_bounds(self):
        self.assertEqual(module.validate_transcription(valid(), 10), 1)
        self.assertEqual(module.validate_transcription(valid(600000), 600), 1)
        data = valid(); data['transcription'].append({'offsets': {'from': 10000, 'to': 11000}, 'text': '다음 설명'})
        self.assertEqual(module.validate_transcription(data, 11), 2)

    def test_empty_and_blank_are_not_evidence(self):
        for rows in [[], None, '', [{'offsets': {'from': 0, 'to': 10000}, 'text': ' \n\t'}]]:
            with self.subTest(rows=rows), self.assertRaises(ValueError):
                data=valid();data['transcription']=rows;module.validate_transcription(data,10)

    def test_language_and_translation_must_be_exact(self):
        for key,field,value in [('result','language','en'),('result','language',None),('params','language','auto'),('params','language',True),('params','translate',True),('params','translate',0),('params','translate',None)]:
            with self.subTest(field=field,value=value),self.assertRaises(ValueError):
                data=valid();data[key][field]=value;module.validate_transcription(data,10)

    def test_duration_numeric_finite_and_inclusive_10_to_600(self):
        for duration in [True,False,float('nan'),float('inf'),-float('inf'),-1,0,9.99999,600.00001,'10',None]:
            with self.subTest(duration=duration),self.assertRaises(ValueError):module.validate_transcription(valid(),duration)

    def test_offsets_reject_bool_nonfinite_and_nonnumeric(self):
        for field in ['from','to']:
            for value in [True,False,float('nan'),float('inf'),-float('inf'),'1000',None]:
                with self.subTest(field=field,value=value),self.assertRaises(ValueError):
                    data=valid();data['transcription'][0]['offsets'][field]=value;module.validate_transcription(data,10)

    def test_negative_reverse_overlap_and_outside_actual_pcm(self):
        for start,end in [(-1,1),(100,99),(0,10031),(10031,10032)]:
            with self.subTest(start=start,end=end),self.assertRaises(ValueError):
                data=valid();data['transcription'][0]['offsets']={'from':start,'to':end};module.validate_transcription(data,10)
        data=valid(5000);data['transcription'].append({'offsets':{'from':4999,'to':6000},'text':'중복'})
        with self.assertRaises(ValueError):module.validate_transcription(data,10)

    def test_30ms_rounding_boundary_not_container_duration(self):
        self.assertEqual(module.validate_transcription(valid(10030),10),1)
        self.assertEqual(module.validate_transcription(valid(10029.999),10),1)
        for end in [10030.000001,11000,600000]:
            with self.subTest(end=end),self.assertRaises(ValueError):module.validate_transcription(valid(end),10)

    def test_text_must_be_string(self):
        for value in [None,False,42,{},[]]:
            with self.subTest(value=value),self.assertRaises(ValueError):
                data=valid();data['transcription'][0]['text']=value;module.validate_transcription(data,10)

class FileAndPrelaunchBoundaries(unittest.TestCase):
    def test_regular_path_rejects_input_or_parent_symlink(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp).resolve();file=root/'audio.bin';file.write_bytes(b'input')
            self.assertEqual(module.regular_path(file),file)
            (root/'link').symlink_to(file);(root/'parent').symlink_to(root,target_is_directory=True)
            for candidate in [root/'link',root/'parent/audio.bin',root,root/'absent']:
                with self.subTest(candidate=candidate),self.assertRaises(ValueError):module.regular_path(candidate)

    def prelaunch(self,kind):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp).resolve();(root/'docs/operations').mkdir(parents=True);(root/'artifacts/private').mkdir(parents=True)
            (root/'docs/operations/run.json').write_text(json.dumps({'deadlineAt':'2099-01-01T00:00:00Z'}))
            source=root/'input.bin';source.write_bytes(b'not decoded: prelaunch rejection fixture')
            tools={}
            for name in ['cli','model','ffmpeg']:
                f=root/name;f.write_bytes(name.encode());tools[name]=(f,hashlib.sha256(name.encode()).hexdigest())
            output=root/'artifacts/private/result'
            if kind in ['cli','model']:
                f,_=tools[kind];tools[kind]=(f,'0'*64)
            elif kind=='existing':
                output.mkdir();(output/'original').write_bytes(b'immutable')
            elif kind=='symlink':
                real=root/'artifacts/private/real';real.mkdir();output.symlink_to(real,target_is_directory=True)
            with patch.object(module,'ROOT',root),patch.object(module,'TOOLS',tools),patch.object(sys,'argv',['transcribe-audio.py','--input',str(source),'--output-dir',str(output)]),patch.object(module.subprocess,'run',side_effect=AssertionError('Must not launch decoding or ASR')) as launch:
                with self.assertRaises((ValueError,FileExistsError)):module.main()
                launch.assert_not_called()
            if kind=='existing':self.assertEqual((output/'original').read_bytes(),b'immutable')
            elif kind in ['cli','model']:self.assertFalse(output.exists())

    def test_cli_hash_mismatch_prevents_decoder_launch(self):self.prelaunch('cli')
    def test_model_hash_mismatch_prevents_decoder_launch(self):self.prelaunch('model')
    def test_existing_output_preserved_before_launch(self):self.prelaunch('existing')
    def test_output_symlink_rejected_before_launch(self):self.prelaunch('symlink')

    def test_receipt_late_fsync_contract_static_not_fake_asr_success(self):
        # Source-order check only, deliberately not an invented ASR/main success.
        text=SOURCE.read_text();ast.parse(text)
        self.assertIn('"state": "TECHNICAL_ASR_RECORDED"',text)
        self.assertIn('"requiresSuccessfulExitReceipt": True',text)
        self.assertIn('"directListening": False',text)
        self.assertIn('"naturalPronunciationVerified": False',text)
        start=text.index('os.fsync(stream.fileno())')
        rest=text[start:]
        self.assertLess(rest.index('remaining()'),rest.index('receipt_hash = sha256'))
        self.assertLess(rest.index('receipt_hash = sha256'),rest.index('print(json.dumps'))
        self.assertIn('sha256(receipt_path, remaining)',rest)

if __name__=='__main__':unittest.main(verbosity=2)
