# Variações de gancho: gancho novo + miolo do criativo original (áudio, cenas e legendas deslocados).
import sys, json, subprocess
sys.argv = ['x', 'nenhum']            # importa edit.py sem renderizar os originais
sys.path.insert(0, '/tmp/claude-0/-home-user-docs/1b8e7bd0-ddc7-5df4-909a-a1352f42bf5a/scratchpad/ed')
import edit as E

HK = '/tmp/claude-0/-home-user-docs/1b8e7bd0-ddc7-5df4-909a-a1352f42bf5a/scratchpad/audio/hooks'
GAP = 0.12
BASE = {1: (E.T1, E.C1, 25.2), 2: (E.T2, E.C2, 22.6), 3: (E.T3, E.C3, 22.3)}

def dur(p):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]))

def hook_caps(i, groups):
    w = json.load(open(f'{HK}/gancho-{i}.palavras.json'))
    out = []
    for k, (j, text) in enumerate(groups):
        t1 = w[groups[k + 1][0]]['s'] if k + 1 < len(groups) else w[-1]['e'] + GAP
        out.append((w[j]['s'], t1 - 0.02, text))
    return out

def build(name, hook, base, splice_word, scenes, groups):
    T, C, cta = BASE[base]
    words = json.load(open(f'{E.AU}/criativo-{base}.palavras.json'))
    cut = max(0.0, words[splice_word]['s'] - 0.04)
    hook_wav = f'{HK}/gancho-{hook}.wav'
    hl = dur(hook_wav) + GAP
    shift = hl - cut
    # áudio: gancho + respiro + miolo
    audio = f'{E.AU}/criativo-{name}.mp3'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', hook_wav, '-ss', f'{cut:.3f}', '-i', f'{E.AU}/criativo-{base}.mp3',
                    '-filter_complex', f'[0]apad=pad_dur={GAP}[h];[h][1]concat=n=2:v=0:a=1', '-ar', '44100', '-b:a', '192k', audio], check=True)
    total = dur(audio)
    # cenas: as do gancho + as do miolo (a cena em curso no corte entra já avançada)
    tl = list(scenes)
    for k, (t0, src, off) in enumerate(T):
        t1 = T[k + 1][0] if k + 1 < len(T) else 999
        if t1 <= cut: continue
        if t0 < cut: tl.append((hl, src, off + (cut - t0)))
        else: tl.append((t0 + shift, src, off))
    caps = hook_caps(hook, groups) + [(a + shift, b + shift, t) for a, b, t in C if a >= cut - 0.02]
    files = []
    for k, (t0, src, off) in enumerate(tl):
        t1 = tl[k + 1][0] if k + 1 < len(tl) else total + 0.05
        files.append(E.clip(hash(name) % 9000 + 1000 + k, src, off, t1 - t0))
    lst = f'{E.ED}/clips/list-{name}.txt'
    open(lst, 'w').write(''.join(f"file '{f}'\n" for f in files))
    ass = f'{E.ED}/cap-{name}.ass'
    E.write_ass(ass, caps, cta + shift, total)
    out = f'{E.OUT}/criativo-{name}.mp4'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-i', audio,
                    '-vf', f"drawbox=x=0:y=0:w=iw:h=ih:color=black@0.55:t=fill:enable='gte(t,{cta + shift})',ass={ass}:fontsdir={E.ED}/fonts",
                    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '30',
                    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], check=True)
    print('ok', name, round(total, 1), 's')

V = {
  '1b': (1, 1, 10, [(0, 'yt-busca', 2.4), (1.6, 'yt-scrub', 0.7)],
         [(0, 'QUANTO TEMPO VOCÊ PERDEU HOJE'), (5, 'PROCURANDO MISSÃO NO *YOUTUBE*?')]),
  '1c': (2, 1, 10, [(0, 'v4', 10.0), (1.6, 'v1', 3.0)],
         [(0, 'PAUSOU O *GTA VI* PRA VER UM VÍDEO'), (8, 'E JÁ FAZ *20 MINUTOS*')]),
  '2b': (3, 2, 25, [(0, 'v8', 10.4), (2.5, 'app-perdivel', 2.1)],
         [(0, 'O *GTA VI* ZERA SEU DINHEIRO'), (6, 'NO FIM DO *CAPÍTULO 1*'), (11, 'E TEM MISSÃO QUE *SOME PRA SEMPRE*'), (18, 'SE VOCÊ AVANÇAR O CAPÍTULO')]),
  '2c': (4, 2, 0, [(0, 'v7f', 2.2), (2.0, 'v1', 8.0), (3.1, 'v9', 5.8)],
         [(0, 'QUER PLATINAR O *GTA VI*'), (5, 'SEM PASSAR *200 HORAS* NO ESCURO?'), (11, 'ENTÃO *PRESTA ATENÇÃO*')]),
  '2d': (5, 2, 0, [(0, 'v11', 2.0), (1.6, 'v1', 8.0)],
         [(0, 'VOCÊ VAI *PERDER MISSÃO* NO GTA VI'), (7, 'E *NEM VAI SABER*')]),
  '2e': (6, 2, 0, [(0, 'v10', 1.0), (1.5, 'app-capitulo', 1.4)],
         [(0, 'NÃO AVANÇA O *CAPÍTULO 1*'), (5, 'DO *GTA VI*'), (7, 'ANTES DE *VER ISSO*')]),
  '3b': (7, 3, 8, [(0, 'v4', 5.0), (1.3, 'app-home', 1.0)],
         [(0, 'ESSE APP FEZ EU'), (4, '*PARAR DE PAUSAR* O GTA VI')]),
  '3c': (8, 3, 8, [(0, 'app-pct-a', 0.7), (1.0, 'app-pct-b', 0.7), (2.0, 'app-pct-c', 0.7)],
         [(0, 'OLHA A MINHA *PORCENTAGEM*'), (7, 'SUBINDO'), (8, 'SEM ABRIR O *YOUTUBE*')]),
}
for name in (sys.argv_orig if hasattr(sys, 'argv_orig') else V):
    build(name, *V[name])
