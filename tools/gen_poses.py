"""
gen_poses.py -- Auto-generate 3D bone poses from sign-mapper.js 2D coordinates.

Reads every SIGNS entry from sign-mapper.js and produces pose-library.js
additions for all sign keys that are NOT already defined there.

Run from project root:
    python tools/gen_poses.py

Output is appended at the end of extension/3d/pose-library.js before the
closing 'export const NEUTRAL_POOL' line.
"""

import re, math, sys
from pathlib import Path

ROOT = Path(__file__).parent.parent

# ── 2D viewport constants (from sign-mapper.js header) ────────────────────────
SH_R = (270, 90)   # right shoulder
SH_L = (90,  90)   # left shoulder
REST_R_WRIST = (295, 210)
REST_L_WRIST = (65,  210)

# ── Hand shape → finger rotations ─────────────────────────────────────────────
OPEN       = '{ x: 0, y: 0, z: 0   }'
CURL       = '{ x: 0, y: 0, z: 1.4 }'
SEMI       = '{ x: 0, y: 0, z: 0.7 }'
THUMB_CURL = '{ x: 0, y: 0, z: 0.6 }'
THUMB_OPEN = '{ x: 0, y: 0, z: 0   }'

def hand_shape(shape_name, side='R'):
    """Return (index1, middle1, ring1, pinky1, thumb1) rotation strings."""
    s = (shape_name or 'FLAT').upper().strip()
    tbl = {
        'FLAT':   (OPEN, OPEN, OPEN, OPEN, OPEN),
        'OPEN':   (OPEN, OPEN, OPEN, OPEN, OPEN),
        'FLAT_B': (OPEN, OPEN, OPEN, OPEN, THUMB_CURL),
        'B':      (OPEN, OPEN, OPEN, OPEN, THUMB_CURL),
        'FIST':   (CURL, CURL, CURL, CURL, THUMB_CURL),
        'A':      (CURL, CURL, CURL, CURL, THUMB_CURL),
        'S':      (CURL, CURL, CURL, CURL, THUMB_CURL),
        'E':      (CURL, CURL, CURL, CURL, CURL),
        'V':      (OPEN, OPEN, CURL, CURL, SEMI),
        'U':      (OPEN, OPEN, CURL, CURL, THUMB_CURL),
        'H':      (OPEN, OPEN, CURL, CURL, THUMB_CURL),
        'INDEX':  (OPEN, CURL, CURL, CURL, THUMB_CURL),
        'D':      (OPEN, CURL, CURL, CURL, THUMB_CURL),
        'G':      (OPEN, CURL, CURL, CURL, SEMI),
        'X':      (SEMI, CURL, CURL, CURL, THUMB_CURL),
        'HOOK':   (SEMI, CURL, CURL, CURL, THUMB_CURL),
        'C':      (SEMI, SEMI, SEMI, SEMI, SEMI),
        'O':      (CURL, CURL, CURL, CURL, THUMB_CURL),
        'F':      (SEMI, OPEN, OPEN, OPEN, SEMI),
        'L':      (OPEN, CURL, CURL, CURL, OPEN),
        'Y':      (CURL, CURL, CURL, OPEN, OPEN),
        'ILY':    (OPEN, CURL, CURL, OPEN, OPEN),
        'HORNS':  (OPEN, CURL, CURL, OPEN, THUMB_CURL),
        'BENT':   (SEMI, SEMI, SEMI, SEMI, SEMI),
        'W':      (OPEN, OPEN, OPEN, CURL, THUMB_CURL),
        'K':      (OPEN, OPEN, CURL, CURL, SEMI),
        'R':      (OPEN, OPEN, CURL, CURL, THUMB_CURL),  # crossed fingers
        'N':      (CURL, CURL, CURL, CURL, SEMI),
        'T':      (CURL, CURL, CURL, CURL, SEMI),
        'M':      (CURL, CURL, CURL, CURL, SEMI),
        'CLAW':   (SEMI, SEMI, SEMI, SEMI, SEMI),
        'RELAXED': (SEMI, SEMI, SEMI, SEMI, SEMI),
    }
    return tbl.get(s, (OPEN, OPEN, OPEN, OPEN, OPEN))  # default: flat

# ── 2D → 3D conversion ────────────────────────────────────────────────────────

def lerp(x, x0, x1, y0, y1):
    """Linear interpolation, clamped."""
    if x1 == x0:
        return y0
    t = (x - x0) / (x1 - x0)
    t = max(0.0, min(1.0, t))
    return y0 + t * (y1 - y0)

def interp_piecewise(x, xs, ys):
    """Piecewise linear interpolation."""
    for i in range(len(xs) - 1):
        if xs[i] <= x <= xs[i+1]:
            return lerp(x, xs[i], xs[i+1], ys[i], ys[i+1])
    if x < xs[0]:
        return ys[0]
    return ys[-1]

def right_arm_3d(elbow, wrist):
    """
    Convert 2D right arm coords to 3D Euler angles.
    Returns dict with RightUpperArm, RightForeArm, RightHand.
    """
    ex, ey = elbow['x'], elbow['y']
    wx, wy = wrist['x'], wrist['y']
    sx, sy = SH_R

    # -- Upper arm: shoulder to elbow direction --
    # z: raise/lower  (y decreases = arm goes up = z becomes more negative)
    ua_z = interp_piecewise(ey, [30, 90, 130, 170, 210], [-1.4, -0.9, -0.45, -0.1, 0.15])
    # x: forward/back (elbow x decreasing = arm crosses body = slightly forward)
    ua_x = interp_piecewise(ex, [130, 200, 250, 270, 310], [0.5, 0.25, 0.05, 0.0, -0.1])
    # y: internal rotation (elbow toward center = arm swings in)
    ua_y = interp_piecewise(ex, [130, 200, 260, 270, 310], [0.45, 0.2, 0.05, 0.0, -0.15])

    # -- Forearm: elbow bend from elbow-to-wrist vs shoulder-to-elbow angle --
    # Compute vectors
    ae = (ex - sx, ey - sy)   # shoulder → elbow
    ew = (wx - ex, wy - ey)   # elbow → wrist
    ae_len = math.hypot(*ae)
    ew_len = math.hypot(*ew)
    if ae_len > 0 and ew_len > 0:
        dot = (ae[0]*ew[0] + ae[1]*ew[1]) / (ae_len * ew_len)
        dot = max(-1.0, min(1.0, dot))
        angle_at_elbow = math.acos(dot)  # 0 = straight, π = fully folded
        fa_x = interp_piecewise(angle_at_elbow,
                                [0.0, 0.5, 1.0, 1.6, math.pi],
                                [0.0, 0.4, 0.9, 1.3, 1.6])
    else:
        fa_x = 0.5
    fa_y = 0.0
    fa_z = 0.0

    # -- Wrist: subtle tilt based on wrist offset from elbow --
    wh_x = interp_piecewise(wy - ey, [-40, -10, 0, 20, 60], [0.3, 0.1, 0, -0.1, -0.3])
    wh_y = interp_piecewise(wx - ex, [-40, -20, 0, 20, 40], [-0.3, -0.1, 0, 0.1, 0.3])

    return {
        'RightUpperArm': (round(ua_x, 2), round(ua_y, 2), round(ua_z, 2)),
        'RightForeArm':  (round(fa_x, 2), round(fa_y, 2), round(fa_z, 2)),
        'RightHand':     (round(wh_x, 2), round(wh_y, 2), 0.0),
    }

def left_arm_3d(elbow, wrist):
    """Mirror of right_arm_3d for left arm."""
    ex, ey = elbow['x'], elbow['y']
    wx, wy = wrist['x'], wrist['y']
    sx, sy = SH_L

    # Mirror: x axis is flipped for left arm
    ua_z = interp_piecewise(ey, [30, 90, 130, 170, 210], [-1.4, -0.9, -0.45, -0.1, 0.15])
    ua_x = interp_piecewise(ex, [50, 100, 130, 160, 230], [-0.1, 0.0, 0.05, 0.25, 0.5])
    ua_y = interp_piecewise(ex, [50, 80, 110, 170, 230], [0.15, 0.0, -0.05, -0.2, -0.45])

    ae = (ex - sx, ey - sy)
    ew = (wx - ex, wy - ey)
    ae_len = math.hypot(*ae)
    ew_len = math.hypot(*ew)
    if ae_len > 0 and ew_len > 0:
        dot = (ae[0]*ew[0] + ae[1]*ew[1]) / (ae_len * ew_len)
        dot = max(-1.0, min(1.0, dot))
        angle_at_elbow = math.acos(dot)
        fa_x = interp_piecewise(angle_at_elbow,
                                [0.0, 0.5, 1.0, 1.6, math.pi],
                                [0.0, 0.4, 0.9, 1.3, 1.6])
    else:
        fa_x = 0.5
    fa_y = 0.0

    wh_x = interp_piecewise(wy - ey, [-40, -10, 0, 20, 60], [0.3, 0.1, 0, -0.1, -0.3])
    wh_y = interp_piecewise(wx - ex, [-40, -20, 0, 20, 40], [0.3, 0.1, 0, -0.1, -0.3])

    return {
        'LeftUpperArm': (round(ua_x, 2), round(ua_y, 2), round(ua_z, 2)),
        'LeftForeArm':  (round(fa_x, 2), round(fa_y, 2), 0.0),
        'LeftHand':     (round(wh_x, 2), round(wh_y, 2), 0.0),
    }

# ── Motion mapping ────────────────────────────────────────────────────────────
MOTION_MAP = {
    'motion-wave':   'wave',
    'motion-wave_l': 'wave_l',
    'motion-circle': 'circle_r',
    'motion-circle_l': 'circle_l',
    'motion-nod':    'nod',
    'motion-shake':  'shake_head',
    'motion-lift':   'lift_r',
    'motion-push':   None,   # one-shot, no loop
    'motion-pull':   None,
    'motion-tap':    None,
    'motion-swipe':  None,
    'motion-press':  None,
}

# ── Parse sign-mapper.js ──────────────────────────────────────────────────────

def parse_sign_mapper(path):
    """Extract all SIGNS entries from sign-mapper.js."""
    with open(path, encoding='utf-8') as f:
        content = f.read()

    # Find the SIGNS object
    m = re.search(r'const SIGNS\s*=\s*\{', content)
    if not m:
        sys.exit('Could not find SIGNS in sign-mapper.js')
    start = m.end()

    # Walk to find matching closing brace (depth counting)
    depth = 1
    i = start
    while i < len(content) and depth > 0:
        if content[i] == '{':
            depth += 1
        elif content[i] == '}':
            depth -= 1
        i += 1
    signs_block = content[start:i-1]

    # Extract each top-level sign key + its body
    signs = {}
    # Regex: key followed by { ... } at depth 1
    pattern = re.compile(r'(\b[A-Z][A-Z0-9_]*\b)\s*:\s*\{')
    pos = 0
    for key_m in pattern.finditer(signs_block):
        key = key_m.group(1)
        body_start = key_m.end()
        # Find end of this sign's object
        depth2 = 1
        j = body_start
        while j < len(signs_block) and depth2 > 0:
            if signs_block[j] == '{':
                depth2 += 1
            elif signs_block[j] == '}':
                depth2 -= 1
            j += 1
        body = signs_block[body_start:j-1]
        signs[key] = body

    return signs

def extract_coords(body, key):
    """Extract { x: N, y: N } dict from a body string given a key like 'elbow'."""
    m = re.search(key + r'\s*:\s*\{\s*x\s*:\s*([0-9.]+)\s*,\s*y\s*:\s*([0-9.]+)', body)
    if m:
        return {'x': float(m.group(1)), 'y': float(m.group(2))}
    return None

def extract_str(body, key):
    """Extract a string value for a given key."""
    m = re.search(key + r"\s*:\s*'([^']+)'", body)
    if m:
        return m.group(1)
    m = re.search(key + r'\s*:\s*"([^"]+)"', body)
    if m:
        return m.group(1)
    return None

# ── Generate pose JS ──────────────────────────────────────────────────────────

def rot(x, y, z):
    return f'{{ x: {x:5.2f}, y: {y:5.2f}, z: {z:5.2f} }}'

def finger_block(idx, mid, ring, pinky, thumb, side='Right'):
    lines = []
    if side == 'Right':
        lines.append(f'    RightIndex1: {idx}, RightMiddle1: {mid}, RightRing1: {ring}, RightPinky1: {pinky}, RightThumb1: {thumb},')
    else:
        lines.append(f'    LeftIndex1:  {idx}, LeftMiddle1:  {mid}, LeftThumb1:   {thumb},')
    return '\n'.join(lines)

def gen_pose(key, body):
    lines = [f'  {key}: {{']

    # Right arm
    r_elbow = extract_coords(body, r'right\s*:\s*\{[^}]*elbow')
    r_wrist = extract_coords(body, r'right\s*:\s*\{[^}]*wrist') or \
              extract_coords(body, r'wrist')
    if not r_elbow:
        # Try simplified 'right: { elbow... }' pattern
        rb = re.search(r'right\s*:\s*\{(.+?)\}', body, re.DOTALL)
        if rb:
            r_elbow = extract_coords(rb.group(1), 'elbow')
            r_wrist = extract_coords(rb.group(1), 'wrist')

    if r_elbow and r_wrist:
        arm = right_arm_3d(r_elbow, r_wrist)
        ux, uy, uz = arm['RightUpperArm']
        fx, fy, fz = arm['RightForeArm']
        hx, hy, hz = arm['RightHand']
        lines.append(f'    RightUpperArm: {rot(ux, uy, uz)},')
        lines.append(f'    RightForeArm:  {rot(fx, fy, fz)},')
        lines.append(f'    RightHand:     {rot(hx, hy, hz)},')
    else:
        # Default: arm at rest
        lines.append('    RightUpperArm: { x: 0.00, y: 0.00, z:  0.15 },')
        lines.append('    RightForeArm:  { x: 0.10, y: 0.00, z:  0.00 },')
        lines.append('    RightHand:     { x: 0.00, y: 0.00, z:  0.00 },')

    # Right fingers
    r_hand_shape = extract_str(body, 'rHand')
    idx, mid, ring, pinky, thumb = hand_shape(r_hand_shape)
    lines.append(f'    RightIndex1: {idx}, RightMiddle1: {mid}, RightRing1: {ring}, RightPinky1: {pinky}, RightThumb1: {thumb},')

    # Left arm (if defined)
    lb = re.search(r'left\s*:\s*\{(.+?)\}', body, re.DOTALL)
    if lb:
        l_elbow = extract_coords(lb.group(1), 'elbow')
        l_wrist  = extract_coords(lb.group(1), 'wrist')
        if l_elbow and l_wrist:
            arm_l = left_arm_3d(l_elbow, l_wrist)
            ux, uy, uz = arm_l['LeftUpperArm']
            fx, fy, fz = arm_l['LeftForeArm']
            hx, hy, hz = arm_l['LeftHand']
            lines.append(f'    LeftUpperArm:  {rot(ux, uy, uz)},')
            lines.append(f'    LeftForeArm:   {rot(fx, fy, fz)},')
            lines.append(f'    LeftHand:      {rot(hx, hy, hz)},')
            l_hand_shape = extract_str(body, 'lHand')
            li, lm, lr, lp, lt = hand_shape(l_hand_shape)
            lines.append(f'    LeftIndex1:    {li}, LeftMiddle1: {lm}, LeftThumb1: {lt},')
    else:
        # Left arm at rest
        lines.append('    LeftUpperArm:  { x: 0.00, y: 0.00, z: -0.15 },')
        lines.append('    LeftForeArm:   { x: 0.10, y: 0.00, z:  0.00 },')

    # Motion
    r_motion = extract_str(body, 'rMotion')
    if r_motion:
        motion_3d = MOTION_MAP.get(r_motion)
        if motion_3d:
            lines.append(f"    motion: '{motion_3d}',")

    lines.append('  },')
    return '\n'.join(lines)

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    mapper_path = ROOT / 'extension' / 'content' / 'sign-mapper.js'
    pose_path   = ROOT / 'extension' / '3d' / 'pose-library.js'

    # Parse all signs from sign-mapper
    print('Parsing sign-mapper.js...')
    all_signs = parse_sign_mapper(mapper_path)
    print(f'  Found {len(all_signs)} sign definitions')

    # Find which keys already exist in pose-library
    with open(pose_path, encoding='utf-8') as f:
        pose_content = f.read()

    existing = set(re.findall(r'^\s{2}([A-Z][A-Z0-9_]+)\s*:', pose_content, re.MULTILINE))
    # Also remove constants
    existing -= {'OPEN', 'CURL', 'SEMI', 'THUMB_CURL', 'BONE_ALIASES',
                 'MOTION_CONFIGS', 'POSES', 'WORD_TO_POSE_KEY', 'NEUTRAL_POOL'}

    missing = [k for k in all_signs if k not in existing]
    print(f'  Already in pose-library: {len(existing)} signs')
    print(f'  Missing (will generate): {len(missing)} signs')

    if not missing:
        print('Nothing to generate.')
        return

    # Generate JS for each missing sign
    new_poses = []
    for key in missing:
        try:
            js = gen_pose(key, all_signs[key])
            new_poses.append(js)
        except Exception as e:
            print(f'  [SKIP] {key}: {e}')

    # Insert before the closing `};` of the POSES export
    # Find the last `};` that closes the POSES block
    insertion_marker = '\n  // ── AUTO-GENERATED POSES (from sign-mapper.js 2D coords) ──────────────────\n'
    block = insertion_marker + '\n'.join(new_poses) + '\n\n'

    # Find where to insert: before the NEUTRAL_POOL export
    insert_before = '\nexport const NEUTRAL_POOL'
    if insert_before not in pose_content:
        # Fallback: before closing }; of POSES
        insert_before = '\n};\n\nexport const WORD_TO_POSE_KEY'

    idx = pose_content.find(insert_before)
    if idx == -1:
        print('ERROR: Could not find insertion point in pose-library.js')
        sys.exit(1)

    new_content = pose_content[:idx] + block + pose_content[idx:]

    with open(pose_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f'\nDone. Added {len(new_poses)} poses to pose-library.js.')
    print('Signs added:', ', '.join(k for k in missing[:20]),
          f'... (+{len(missing)-20} more)' if len(missing) > 20 else '')

if __name__ == '__main__':
    main()
