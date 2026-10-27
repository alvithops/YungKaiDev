#!/usr/bin/env python3
"""Baterai uji E-Learning PKL-Web (jalan: npm test / python3 tests/uji.py).
Membersihkan akun ujinya sendiri di akhir. Keluar 0 = semua lolos."""
import json, urllib.request, urllib.error, io, sys, time
SUF = str(int(time.time()))[-5:]  # akun unik tiap run → baterai hermetik

BASE = 'http://localhost:3000'
P, F = 0, 0
GAGAL = []

def req(method, path, token=None, body=None, files=None):
    url = BASE + path
    headers = {}
    if token: headers['Authorization'] = 'Bearer ' + token
    data = None
    if files:
        b = '----UJI1234'
        buf = io.BytesIO()
        for k, v in (body or {}).items():
            buf.write(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
        for k, (fn, content) in files.items():
            buf.write(f'--{b}\r\nContent-Disposition: form-data; name="{k}"; filename="{fn}"\r\nContent-Type: application/octet-stream\r\n\r\n'.encode() + content + b'\r\n')
        buf.write(f'--{b}--\r\n'.encode())
        data = buf.getvalue()
        headers['Content-Type'] = f'multipart/form-data; boundary={b}'
    elif body is not None:
        data = json.dumps(body).encode()
        headers['Content-Type'] = 'application/json'
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode() or '{}')
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode() or '{}')
        except Exception: return e.code, {}
    except Exception as e:
        return 0, {'__err': str(e)}

def raw_get(path, token=None):
    r = urllib.request.Request(BASE + path, headers={'Authorization': 'Bearer ' + token} if token else {}, method='GET')
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return 0

def cek(nama, kondisi, info=''):
    global P, F
    if kondisi: P += 1; print(f'  ✓ {nama}')
    else: F += 1; GAGAL.append(nama); print(f'  ✗ {nama} {info}')

def tok(j):
    return j.get('data', {}).get('token') if j.get('success') else None

print('== 1. Auth terpisah & keamanan ==')
s, j = req('POST', '/api/auth/register', body={'nama':'M Uji','email':f'mu{SUF}@t.id','password':'mu12345','role':'mentor'})
cek('register mentor', s == 201, f'{s}')
s, j = req('POST', '/api/auth/register', body={'nama':'S Uji','username':f'su{SUF}','email':f'su{SUF}@t.id','password':'su12345','role':'siswa'})
cek('register siswa+username', s == 201, f'{s}')
s, j = req('POST', '/api/auth/register', body={'nama':'X','email':f'su{SUF}@t.id','password':'su12345','role':'siswa'})
cek('tolak email duplikat', s == 409, f'{s}')
s, j = req('POST', '/api/auth/register', body={'nama':'X','username':f'su{SUF}','email':'x@t.id','password':'su12345','role':'siswa'})
cek('tolak username duplikat', s == 409, f'{s}')
s, j = req('POST', '/api/auth/login-siswa', body={'username':f'su{SUF}','password':'su12345'})
TS = tok(j); cek('login-siswa', bool(TS), f'{s}')
s, j = req('POST', '/api/auth/login-mentor', body={'email':f'mu{SUF}@t.id','password':'mu12345'})
TM = tok(j); cek('login-mentor', bool(TM), f'{s}')
s, j = req('POST', '/api/auth/login-mentor', body={'email':f'su{SUF}@t.id','password':'su12345'})
cek('siswa ditolak di login-mentor', s == 403, f'{s}')
s, j = req('POST', '/api/auth/login-siswa', body={'username':f'mu{SUF}@t.id','password':'mu12345'})
cek('mentor ditolak di login-siswa', s == 403, f'{s}')
s, j = req('POST', '/api/auth/login-siswa', body={'username':f'su{SUF}','password':'salah'})
cek('password salah pesan asli', s == 401 and 'password' in j.get('message', '').lower(), f'{s}')
s, j = req('GET', '/api/kelas', token='palsu')
cek('token palsu 401', s == 401, f'{s}')

print('== 2. Kelas ==')
s, j = req('POST', '/api/kelas', token=TS, body={'nama_kelas':'X'})
cek('siswa dilarang buat kelas', s == 403, f'{s}')
s, j = req('POST', '/api/kelas', token=TM, body={'nama_kelas':'Kelas Uji'})
KID = j['data']['id']; KODE = j['data']['kode_kelas']
cek('buat kelas + kode', s == 201 and bool(KODE), f'{s}')
s, j = req('POST', '/api/kelas/join', token=TS, body={'kode_kelas':'SALAH'})
cek('kode salah 404', s == 404, f'{s}')
s, j = req('POST', '/api/kelas/join', token=TS, body={'kode_kelas':KODE})
cek('join', s == 200, f'{s}')
s, j = req('GET', f'/api/kelas/{KID}', token=TS)
cek('status_saya aktif', s == 200 and j['data'].get('status_saya') == 'aktif', f'{s}')

print('== 3. Pertemuan + materi (ganti file) ==')
s, j = req('POST', f'/api/kelas/{KID}/materi', token=TM, body={'judul':'M Penuh'}, files={'file':('a.pdf', b'v1')})
MID = j['data']['id'] if j.get('success') else None
cek('materi + file', s == 201, f'{s}')
F1 = j['data']['file_path']
s, j = req('PUT', f'/api/materi/{MID}', token=TM, body={'judul':'M Rev'}, files={'file':('b.pdf', b'v22222')})
cek('ganti file materi', s == 200 and j['data']['file_path'] != F1 and j['data']['judul'] == 'M Rev', f'{s}')
F1 = j['data']['file_path'] if j.get('success') else F1
s, j = req('GET', f'/api/kelas/{KID}/materi?q=Rev&limit=1', token=TM)
cek('cari materi', s == 200 and len(j['data']) == 1, f'{s}')

print('== 4. Unduhan terkunci ==')
cek('tanpa token 401', raw_get(f'/api/file?f={F1}') == 401)
cek('pemilik 200', raw_get(f'/api/file?f={F1}&token={TS}') == 200)
cek('traversal 403', raw_get(f'/api/file?f=/uploads/../server.js&token={TS}') == 403)
cek('jalur lama 404', raw_get(F1) == 404)

print('== 5. Tugas + nilai ==')
s, j = req('POST', f'/api/kelas/{KID}/tugas', token=TM, body={'judul':'T P2','pertemuan':2})
TID = j['data']['id']
cek('tugas P2', s == 201 and j['data']['pertemuan'] == 2, f'{s}')
s, j = req('POST', f'/api/tugas/{TID}/kumpul', token=TS, body={'tipe':'code','bahasa':'py','kode_program':'print(1)'})
cek('kumpul kode', s == 201, f'{s}')
s, j = req('GET', f'/api/tugas/{TID}/pengumpulan', token=TM)
PID = j['data'][0]['id']
s, j = req('PUT', f'/api/pengumpulan/{PID}/nilai', token=TM, body={'nilai':85})
cek('nilai tersimpan', s == 200, f'{s}')

print('== 6. Kuis: esai + timer + acak + hapus ==')
s, j = req('POST', f'/api/kelas/{KID}/kuis', token=TM, body={'judul':'K Campur','durasi_menit':30})
QID = j['data']['id']
s, j = req('POST', f'/api/kuis/{QID}/soal', token=TM, body={'pertanyaan':'Jelaskan X','tipe':'essay'})
EID = j['data']['id'] if j.get('success') else None
cek('soal esai', s == 201 and j['data']['tipe'] == 'essay', f'{s} {j}')
s, j = req('POST', f'/api/kuis/{QID}/soal', token=TM, body={'pertanyaan':'1+1?','opsi_a':'1','opsi_b':'2','opsi_c':'3','opsi_d':'4','kunci':'B'})
GID = j['data']['id'] if j.get('success') else None
cek('soal pg', s == 201, f'{s}')
s, j = req('PUT', f'/api/kuis/soal/{GID}', token=TM, body={'kunci':'C'})
cek('ubah kunci via API', s == 200 and j['data']['kunci'] == 'C', f'{s}')
s, j = req('PUT', f'/api/kuis/soal/{GID}', token=TM, body={'kunci':'B'})
s, j = req('POST', f'/api/kuis/{QID}/submit', token=TS, body={'jawaban':{str(EID):'x', str(GID):'B'}})
cek('submit tanpa mulai ditolak', s == 400, f'{s} {j}')
s, j = req('POST', f'/api/kuis/{QID}/mulai', token=TS)
cek('mulai (timer)', s == 201 and 'mulai_pada' in j['data'], f'{s} {j}')
s, j = req('GET', f'/api/kuis/{QID}/soal', token=TS)
cek('soal acak tanpa kunci', s == 200 and all('kunci' not in x for x in j['data']), f'{s}')
s, j = req('POST', f'/api/kuis/{QID}/submit', token=TS, body={'jawaban':{str(EID):'Esai mantap', str(GID):'B'}})
cek('submit esai menunggu', s == 200 and j['data']['esai_menunggu'] == 1 and j['data']['skor'] == 100, f'{s} {j}')
s, j = req('GET', f'/api/kuis/{QID}/hasil', token=TM)
HID = j['data'][0]['id']
s, j = req('PUT', f'/api/kuis/hasil/{HID}/nilai', token=TM, body={'skor':90,'feedback':'Bagus'})
cek('nilai final esai', s == 200 and j['data']['skor'] == 90, f'{s}')
s, j = req('POST', f'/api/kelas/{KID}/kuis', token=TM, body={'judul':'K Bobot','durasi_menit':10})
QB = j['data']['id']
s, j = req('POST', f'/api/kuis/{QB}/soal', token=TM, body={'pertanyaan':'M','opsi_a':'x','opsi_b':'y','opsi_c':'z','opsi_d':'w','kunci':'A','bobot':10})
BA = j['data']['id']
s, j = req('POST', f'/api/kuis/{QB}/soal', token=TM, body={'pertanyaan':'S','opsi_a':'1','opsi_b':'2','opsi_c':'3','opsi_d':'4','kunci':'D','bobot':90})
BB = j['data']['id']
s, j = req('POST', f'/api/kuis/{QB}/mulai', token=TS)
s, j = req('POST', f'/api/kuis/{QB}/submit', token=TS, body={'jawaban':{str(BA):'A', str(BB):'A'}})
cek('skor terbobot (10, bukan 50)', s == 200 and j['data']['skor'] == 10, f'{s} {j}')
s, j = req('DELETE', f'/api/kuis/{QB}', token=TM)
cek('hapus kuis bobot', s == 200, f'{s}')
s, j = req('POST', f'/api/kelas/{KID}/kuis', token=TM, body={'judul':'K Kunci','durasi_menit':10})
QK = j['data']['id']
s, j = req('POST', f'/api/kuis/{QK}/soal', token=TM, body={'pertanyaan':'Apa itu fotosintesis?','tipe':'essay','bobot':100,'kunci_esai':'fotosintesis klorofil cahaya'})
EK = j['data']['id'] if j.get('success') else None
cek('soal esai berkunci', s == 201, f'{s} {j}')
s, j = req('POST', f'/api/kuis/{QK}/mulai', token=TS)
s, j = req('POST', f'/api/kuis/{QK}/submit', token=TS, body={'jawaban':{str(EK):'Fotosintesis memakai KLOROFIL dan CAHAYA'}})
cek('esai cocok → poin penuh otomatis', s == 200 and j['data']['skor'] == 100 and j['data']['esai_otomatis'] == 1, f'{s} {j}')
s, j = req('DELETE', f'/api/kuis/{QK}', token=TM)
cek('hapus kuis kunci', s == 200, f'{s}')
s, j = req('DELETE', f'/api/kuis/soal/{GID}', token=TM)
cek('hapus soal', s == 200, f'{s}')
s, j = req('DELETE', f'/api/kuis/{QID}', token=TM)
cek('hapus kuis', s == 200, f'{s}')
s, j = req('GET', f'/api/kelas/{KID}/kuis', token=TM)
cek('kuis habis', s == 200 and j['data'] == [], f'{s}')

print('== 7. Reset password + keluar/masuk ==')
s, j = req('PUT', f'/api/users/999999/reset-password', token=TM, body={'password_baru':'baru12345'})
cek('reset id asing 404', s == 404, f'{s}')
SID = None
s, j = req('GET', f'/api/kelas/{KID}/anggota', token=TM)
if j.get('success'): SID = j['data'][0]['id']
s, j = req('PUT', f'/api/users/{SID}/reset-password', token=TM, body={'password_baru':'baru12345'})
cek('reset pw anggota', s == 200, f'{s}')
s, j = req('POST', '/api/auth/login-siswa', body={'username':f'su{SUF}','password':'baru12345'})
TS2 = tok(j); cek('login pw baru', bool(TS2), f'{s}')
s, j = req('DELETE', f'/api/kelas/{KID}/keluar', token=TS2)
cek('keluar', s == 200, f'{s}')
s, j = req('GET', f'/api/kelas/{KID}/materi', token=TS2)
cek('terkunci saat keluar', s == 403, f'{s}')
s, j = req('POST', f'/api/kelas/{KID}/masuk', token=TS2)
cek('masuk tanpa kode', s == 200, f'{s}')

print('== 8. Ban + permanent ==')
s, j = req('POST', f'/api/kelas/{KID}/ban', token=TM, body={'siswa_id': SID})
cek('ban', s == 201, f'{s}')
s, j = req('POST', '/api/auth/login-siswa', body={'username':f'su{SUF}','password':'baru12345'})
cek('banned bisa login', s == 200, f'{s}')
s, j = req('GET', f'/api/kelas/{KID}/moderasi', token=TM)
cek('pending otomatis', s == 200 and len(j['data']['pending']) == 1, f'{s}')
s, j = req('POST', '/api/blokir-permanen', token=TM, body={'siswa_id': SID})
cek('blokir permanent', s == 200, f'{s} {j}')
s, j = req('POST', '/api/auth/login-siswa', body={'username':f'su{SUF}','password':'baru12345'})
cek('login terblokir', s == 403, f'{s}')
s, j = req('POST', '/api/auth/register', body={'nama':'Z','username':'z9','email':f'su{SUF}@t.id','password':'su12345','role':'siswa'})
cek('daftar terblokir', s == 403, f'{s}')
s, j = req('GET', '/api/blokir-permanen', token=TM)
cek('riwayat blokir tercatat', s == 200 and any(b['email'].endswith(f'su{SUF}@t.id') for b in j['data']), f'{s} {j}')
bid = next(b['id'] for b in j['data'] if b['email'].endswith(f'su{SUF}@t.id'))
s, j = req('DELETE', f'/api/blokir-permanen/{bid}', token=TM)
cek('buka blokir spesifik (riwayat lain utuh)', s == 200, f'{s}')

print('== 9. Bersih-bersih akun uji ==')
s, j = req('DELETE', f'/api/kelas/{KID}', token=TM)
cek('hapus kelas uji', s == 200, f'{s} {j}')
s, j = req('GET', '/api/blokir-permanen', token=TM)
if j.get('success'):
    for b in j['data']:
        if b['email'].endswith(f'su{SUF}@t.id'):
            req('DELETE', f"/api/blokir-permanen/{b['id']}", token=TM)
s, j = req('DELETE', '/api/auth/me', token=TM)
cek('hapus akun mentor uji', s == 200, f'{s}')

print(f'\nHASIL: {P} lolos, {F} gagal dari {P + F}')
sys.exit(1 if F else 0)
