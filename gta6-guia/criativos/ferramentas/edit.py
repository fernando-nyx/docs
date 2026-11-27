# Monta os 3 criativos: cenas (vídeos + gravações de tela) cortadas no tempo da narração + legenda + áudio.
import json, os, subprocess, sys
ED = '/tmp/claude-0/-home-user-docs/1b8e7bd0-ddc7-5df4-909a-a1352f42bf5a/scratchpad/ed'
BR = '/home/user/docs/gta6-guia/criativos/brutos'
AU = '/home/user/docs/gta6-guia/criativos/audio'
OUT = '/home/user/docs/gta6-guia/criativos/out'
REC = ED + '/rec'
os.makedirs(OUT, exist_ok=True); os.makedirs(ED + '/clips', exist_ok=True)
W, H, FPS = 720, 1280, 30

def src(name):
    name = name.replace('v7f', 'v7')
    return f'{REC}/{name}.webm' if name.startswith(('app-', 'yt-')) else f'{BR}/{name}.mp4'

# Como cada fonte entra no quadro vertical
FILL = 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280'
MODE = {
    'v1': FILL + ',eq=brightness=0.05:contrast=1.08',
    'v8': 'crop=iw*0.84:ih*0.84:(iw-ow)/2:ih*0.03,' + FILL,          # esconde a marca d'água do canto
    'v7': 'BLUR',
    'v7f': 'crop=iw:ih*0.86:0:ih*0.07,' + FILL,                                                       # trailer horizontal: fundo desfocado
}

def clip(i, name, ss, dur):
    out = f'{ED}/clips/{i:03d}.mp4'
    vf = MODE.get(name, FILL)
    common = ['-ss', str(ss), '-i', src(name)]
    if vf == 'BLUR':
        fc = (f'[0:v]split[a][b];[a]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,boxblur=20:2,eq=brightness=-0.15[bg];'
              f'[b]crop=iw:ih*0.42:0:ih*0.29,scale=720:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,')
        filt = ['-filter_complex', fc + f'tpad=stop_mode=clone:stop_duration=5,fps={FPS},setsar=1,format=yuv420p[v]', '-map', '[v]']
    else:
        filt = ['-vf', vf + f',tpad=stop_mode=clone:stop_duration=5,fps={FPS},setsar=1,format=yuv420p']
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *common, *filt, '-t', f'{dur:.3f}', '-an',
                    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', out], check=True)
    return out

def build(n, timeline, captions, cta):
    audio = f'{AU}/criativo-{n}.mp3'
    total = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audio]))
    # timeline: [(início, fonte, offset)] — cada cena vai até o início da próxima
    files = []
    for k, (t0, name, off) in enumerate(timeline):
        t1 = timeline[k + 1][0] if k + 1 < len(timeline) else total + 0.05
        files.append(clip(n * 100 + k, name, off, t1 - t0))
    lst = f'{ED}/clips/list{n}.txt'
    open(lst, 'w').write(''.join(f"file '{f}'\n" for f in files))
    ass = f'{ED}/cap{n}.ass'
    write_ass(ass, captions, cta, total)
    out = f'{OUT}/criativo-{n}.mp4'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-i', audio,
                    '-vf', f"drawbox=x=0:y=0:w=iw:h=ih:color=black@0.55:t=fill:enable='gte(t,{cta})',ass={ass}:fontsdir={ED}/fonts", '-map', '0:v', '-map', '1:a',
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', str(FPS),
                    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], check=True)
    print('ok', out, round(total, 2), 's')

def ts(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f'{h}:{m:02d}:{s:05.2f}'

HL = '{\\c&H00D2FF&}'   # amarelo (BGR)
WH = '{\\c&HFFFFFF&}'
def write_ass(path, caps, cta, total):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Inter Black,58,&H00FFFFFF,&H00FFFFFF,&H38000000,&H00000000,0,0,0,0,100,100,0,0,3,12,0,2,50,50,300,1
Style: Cta,Inter Black,112,&H00FFFFFF,&H00FFFFFF,&H00882EFF,&H00000000,0,0,0,0,100,100,0,0,1,8,0,5,30,30,0,1
Style: Cta2,Inter Black,46,&H0018D2FF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,5,0,5,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    for t0, t1, text in caps:
        # *palavra* = destaque amarelo
        parts = text.split('*')
        txt = ''.join((HL if i % 2 else WH) + p for i, p in enumerate(parts))
        ev.append(f'Dialogue: 0,{ts(t0)},{ts(t1)},Cap,,0,0,0,,{txt}')
    if cta:
        ev.append(f'Dialogue: 1,{ts(cta)},{ts(total + 0.1)},Cta,,0,0,0,,{{\\pos(360,520)}}VICE\\NDETONADO')
        ev.append(f'Dialogue: 1,{ts(cta)},{ts(total + 0.1)},Cta2,,0,0,0,,{{\\pos(360,720)}}TOCA EM "SAIBA MAIS" ↓')
    open(path, 'w').write(head + '\n'.join(ev) + '\n')

def caps_from(n, groups):
    """groups: lista de (índice da 1ª palavra, texto da legenda). Fim = início do próximo grupo."""
    w = json.load(open(f'{AU}/criativo-{n}.palavras.json'))
    out = []
    for k, (i, text) in enumerate(groups):
        t0 = w[i]['s']
        t1 = w[groups[k + 1][0]]['s'] if k + 1 < len(groups) else w[-1]['e'] + 0.3
        out.append((t0, t1 - 0.02, text))
    return out

# ---------------- CRIATIVO 1 — DOR ----------------
T1 = [(0.0, 'v6', 0.3), (1.95, 'yt-busca', 2.4), (3.35, 'v4', 10.0), (4.7, 'yt-busca', 3.7), (5.7, 'yt-scrub', 0.7),
      (6.9, 'yt-player', 1.0), (9.35, 'yt-scrub', 1.6), (10.9, 'yt-ingles', 0.9), (11.65, 'v1', 3.0),
      (14.9, 'app-home', 1.0), (17.2, 'app-lista', 1.2), (18.7, 'app-missao', 3.0), (20.3, 'app-missao', 5.2),
      (21.2, 'v14', 0.5), (22.5, 'v8', 17.4), (24.2, 'v9', 11.5), (25.2, 'app-pct-c', 0.9)]
C1 = caps_from(1, [(0, 'VOCÊ NÃO TÁ JOGANDO *GTA VI*'), (6, 'VOCÊ TÁ ASSISTINDO *YOUTUBE*'), (10, 'TRAVOU NUMA MISSÃO'),
    (13, '*PAUSA.*'), (14, 'ABRE O VÍDEO...'), (17, '*38 MINUTOS*'), (21, 'PULA INTRO'), (23, 'PULA O *DEIXA O LIKE*'),
    (27, 'PULA O *PATROCINADOR*'), (30, 'NÃO É ESSE'), (33, 'ABRE OUTRO'), (35, 'EM *INGLÊS*'), (37, 'MEIA HORA DEPOIS...'),
    (40, 'O CONTROLE TÁ NO SOFÁ'), (45, 'E VOCÊ *NÃO ACHOU NADA*'), (50, 'AGORA IMAGINA ABRIR O CELULAR'), (55, 'E TÁ *TUDO ALI*'),
    (59, 'AS *135 MISSÕES*'), (62, '*PASSO A PASSO* COM IMAGEM'), (67, 'EM *PORTUGUÊS*'), (69, 'É O *VICE DETONADO*'),
    (74, 'O DETONADO COMPLETO DO *GTA VI*'), (80, 'NO SEU CELULAR'), (83, 'TOCA NO BOTÃO'), (86, 'E PARA DE PERDER TEMPO'),
    (91, 'PROCURANDO VÍDEO NO *YOUTUBE*')])

# ---------------- CRIATIVO 2 — DESEJO ----------------
T2 = [(0.0, 'v8', 3.6), (1.9, 'app-perdivel', 2.1), (4.4, 'v8', 10.4), (7.0, 'v1', 8.0), (8.8, 'v7', 6.3),
      (11.4, 'app-home', 1.0), (12.6, 'app-capitulo', 1.4), (15.6, 'app-checklist', 1.6), (18.0, 'app-filtro', 1.5),
      (19.8, 'v7f', 2.2), (21.4, 'v8', 19.0), (22.6, 'app-pct-c', 0.9)]
C2 = caps_from(2, [(0, 'TEM MISSÃO NO *GTA VI*'), (5, 'QUE *SOME PRA SEMPRE*'), (9, 'SE VOCÊ AVANÇAR O CAPÍTULO'),
    (14, 'NO FIM DO *CAPÍTULO 1*'), (20, 'O JOGO *ZERA SEU DINHEIRO*'), (25, 'QUEM DESCOBRE DEPOIS...'), (29, '*PERDE.*'),
    (30, 'QUEM QUER FECHAR OS *100%*'), (36, 'PRECISA *SABER ANTES*'), (39, 'COM O *VICE DETONADO*'), (44, 'VOCÊ SABE O QUE FAZER'),
    (49, 'EM CADA CAPÍTULO ANTES DE AVANÇAR'), (55, 'A *CHECKLIST DOS 100%*'), (60, '*ITEM POR ITEM*'), (63, 'E VOCÊ VÊ NA HORA'),
    (68, 'O QUE *ESTÁ FALTANDO*'), (72, 'O DETONADO COMPLETO DO *GTA VI*'), (79, 'NO SEU CELULAR'), (82, 'TOCA NO BOTÃO'),
    (85, 'E PARA DE PERDER TEMPO'), (90, 'PROCURANDO VÍDEO NO *YOUTUBE*')])

# ---------------- CRIATIVO 3 — RESULTADO ----------------
T3 = [(0.0, 'v4', 5.0), (2.4, 'v1', 1.0), (4.2, 'app-lista', 0.9), (5.1, 'app-missao', 2.2), (7.7, 'app-checklist', 2.0),
      (9.6, 'app-busca', 0.9), (12.8, 'yt-scrub', 0.6), (13.95, 'yt-ingles', 0.8), (15.15, 'v1', 4.0),
      (16.45, 'app-pct-a', 0.7), (17.05, 'app-pct-b', 0.7), (17.65, 'app-pct-c', 0.7), (18.3, 'v14', 3.0), (20.0, 'v9', 1.5), (21.3, 'v13', 4.0), (22.3, 'app-pct-c', 0.9)]
C3 = caps_from(3, [(0, 'É ASSIM QUE EU JOGO *GTA VI* AGORA'), (8, 'CELULAR DO LADO'), (11, 'CONTROLE NA MÃO'), (14, 'CHEGOU NUMA MISSÃO?'),
    (17, '*ABRO*, VEJO O *PASSO A PASSO*'), (23, 'COM IMAGEM E *SIGO*'), (28, 'PEGUEI UM COLECIONÁVEL?'), (31, '*TOCO E MARCO*'),
    (34, 'NÃO SEI ONDE TÁ UMA COISA?'), (40, 'DIGITO NA *BUSCA*'), (42, 'E APARECE *NA HORA*'), (46, '*ZERO* VÍDEO NO YOUTUBE'),
    (50, '*ZERO* ABA EM INGLÊS'), (54, '*ZERO* PAUSA DE MEIA HORA'), (59, 'E A MINHA *PORCENTAGEM*'), (63, '*SÓ SOBE*'),
    (65, 'É O *VICE DETONADO*'), (70, 'O DETONADO COMPLETO DO *GTA VI*'), (76, 'NO SEU CELULAR'), (79, 'TOCA NO BOTÃO'),
    (82, 'E PARA DE PERDER TEMPO'), (87, 'PROCURANDO VÍDEO NO *YOUTUBE*')])

which = sys.argv[1:] or ['1', '2', '3']
if '1' in which: build(1, T1, C1, 25.2)
if '2' in which: build(2, T2, C2, 22.6)
if '3' in which: build(3, T3, C3, 22.3)
