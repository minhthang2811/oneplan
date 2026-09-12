import Svg, {
  Circle, ClipPath, Defs, Ellipse, G, Path, Rect,
} from 'react-native-svg';
import { useTheme } from '../../theme/useTheme';

/**
 * Pip — the Oneplan mascot, drawn as vector rather than shipped as a bitmap.
 *
 * WHY VECTOR. Three things a PNG could not do, all of which this app needs:
 *   1. He recolours from `tokens.ts`, so he cannot drift out of sync with the
 *      palette the way an exported asset does.
 *   2. He is crisp at 72pt in a list and at 220pt on the welcome screen from
 *      one source, with no @2x/@3x set to keep in step.
 *   3. Poses are composable. A bitmap gives you the poses you exported; this
 *      gives you an arm position, which is what makes `cheer` and `phone`
 *      possible at all.
 *
 * HOW IT IS BUILT, and why it is built that way:
 *
 *   - The head and body are CLIPPING REGIONS. Every orange patch and every bit
 *     of shading is drawn loosely and then trimmed to the silhouette by
 *     `clipPath`. Hand-fitting a patch to the inside of an ellipse means
 *     solving for the ellipse at every control point, and it breaks the moment
 *     the head changes by a pixel. Clipping makes the patches sloppy on purpose
 *     and correct by construction.
 *
 *   - Limbs and the tail are STROKES, not filled outlines: a thick `ink` stroke
 *     with a thinner `coat` stroke laid over it, both round-capped. That gives
 *     an outlined limb from a single path, which means a POSE IS JUST A
 *     DIFFERENT SET OF ENDPOINTS. Every pose below is a two-line diff rather
 *     than a redrawn shape.
 *
 *   - Nothing in this file animates. Pip is a still drawing; all motion lives
 *     in `PipScene`, applied as `transform` on views wrapping this SVG. Keeping
 *     the art static means no animated SVG props, so every moving part stays on
 *     the UI thread as a free transform.
 */

export type PipPose =
  /** Sitting, front paws down, looking at you. The default. */
  | 'sit'
  /** Holding a phone, ears up. Used wherever the subject is a notification. */
  | 'phone'
  /** Arms up, eyes happy. Rare tier only — see the frequency gate in DESIGN.md. */
  | 'cheer'
  /** Curled, eyes closed. For a day with nothing in it yet. */
  | 'rest';

/** The drawing's own coordinate space. Every number below is in these units. */
const VB = 200;

/* -- geometry ------------------------------------------------------------- */

const HEAD = { cx: 100, cy: 76, rx: 53, ry: 47 };

const BODY_PATH =
  'M 60,106 C 45,132 43,166 64,179 C 85,192 115,192 136,179 C 157,166 155,132 140,106 Z';

/**
 * Ears taper. A floppy ear is a teardrop — widest where it meets the skull and
 * narrowing to a rounded tip — and the first draft's near-circular lobes read as
 * mouse ears instead. The inner edge is a straight line back up to the attach
 * point because the head is drawn over it and it is never seen.
 */
const EAR_LEFT = 'M 68,40 C 38,38 18,60 19,94 C 20,118 33,133 52,132 C 65,131 69,120 68,106 Z';
const EAR_RIGHT = 'M 132,40 C 162,38 182,60 181,94 C 180,118 167,133 148,132 C 135,131 131,120 132,106 Z';

/**
 * Orange, drawn well past the silhouette and clipped back to it.
 *
 * The head patch is kept ABOVE the glasses on purpose. Drawn lower it crosses
 * the right lens, and a hard colour edge running through an eye reads as a crack
 * in the face rather than as markings.
 */
const HEAD_PATCH = 'M 106,14 C 142,16 172,40 180,70 C 156,82 128,64 118,44 C 110,28 102,18 106,14 Z';
const BODY_PATCH = 'M 38,122 C 58,120 73,136 71,157 C 69,178 50,187 38,176 C 26,164 26,130 38,122 Z';

const TAIL = 'M 64,150 C 44,145 33,157 39,168 C 43,175 53,175 56,168';

/** Arm endpoints per pose: [leftPath, rightPath, leftPaw, rightPaw]. */
const ARMS: Record<PipPose, { l: string; r: string; lp: [number, number]; rp: [number, number] }> = {
  sit: {
    // Front paws land INSIDE the hind paws, so all four read as a stack rather
    // than as four white blobs competing along one line.
    l: 'M 78,130 C 77,146 79,158 83,168',
    r: 'M 122,130 C 123,146 121,158 117,168',
    lp: [84, 169],
    rp: [116, 169],
  },
  phone: {
    // Paws land on the phone's two EDGES, not in front of its middle. Sat close
    // together they simply cover the screen, and a held object you cannot see is
    // just a shape behind two circles.
    l: 'M 75,130 C 69,140 70,148 76,151',
    r: 'M 125,130 C 131,140 130,148 124,151',
    lp: [76, 152],
    rp: [124, 152],
  },
  cheer: {
    // Open arms, not arms-in-the-air. Raised paws land inside the head's own
    // silhouette — and the head is drawn last, so it swallows them. Dropping the
    // celebration to an open-armed "there you go" puts the paws below the ear
    // tips where nothing occludes them, and it suits the app's register better
    // than a fist-pump anyway.
    l: 'M 76,130 C 66,136 56,142 50,150',
    r: 'M 124,130 C 134,136 144,142 150,150',
    lp: [48, 152],
    rp: [152, 152],
  },
  rest: {
    l: 'M 78,134 C 72,148 78,160 90,161',
    r: 'M 122,134 C 128,148 122,160 110,161',
    lp: [91, 162],
    rp: [109, 162],
  },
};

/* -- component ------------------------------------------------------------ */

export function Pip({
  size = 200,
  pose = 'sit',
  /** The contact shadow. Off for poses that are meant to read as airborne. */
  grounded = true,
}: {
  size?: number;
  pose?: PipPose;
  grounded?: boolean;
}) {
  const { pip, c, isDark } = useTheme();
  const arm = ARMS[pose];

  // A limb is one path stroked twice. The ink pass is wider by exactly twice
  // the outline weight so the coat sits centred inside it.
  const limb = (d: string) => (
    <>
      <Path d={d} stroke={pip.ink} strokeWidth={21} strokeLinecap="round" fill="none" />
      <Path d={d} stroke={pip.coat} strokeWidth={13} strokeLinecap="round" fill="none" />
    </>
  );

  const paw = ([x, y]: [number, number]) => (
    <>
      <Circle cx={x} cy={y} r={11.5} fill={pip.coat} stroke={pip.ink} strokeWidth={4.5} />
    </>
  );

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
      <Defs>
        <ClipPath id="pip-head">
          <Ellipse cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry} />
        </ClipPath>
        <ClipPath id="pip-body">
          <Path d={BODY_PATH} />
        </ClipPath>
      </Defs>

      {/* Contact shadow. Without it Pip hangs in space — the single cheapest
          thing that makes a flat character look like it has weight. */}
      {grounded ? (
        <Ellipse cx={100} cy={186} rx={54} ry={8} fill={pip.ground} />
      ) : null}

      {/*
        THE DIE-CUT STICKER RIM — dark mode only.

        Pip's outline is near-black, and on the dark canvas a near-black outline
        against a near-black background is no outline at all: he loses his
        silhouette and reads as a white smear with ears. Printed stickers have
        always solved exactly this with the pale border left around the die cut,
        and the reference art Pip was drawn from has one.

        It is a single pass of every silhouette-defining shape, drawn filled and
        stroked in the coat colour at roughly six units wider than the ink
        outline, underneath everything else. Only the part that overhangs the
        real drawing is ever seen, so the internal seams this pass creates are
        covered by the opaque shapes on top of it.

        Light mode does not get one. There the ink outline already separates him
        from the canvas, and a white rim on a cream background would thicken his
        edge for no benefit.
      */}
      {isDark ? (
        <G fill={pip.coat} stroke={pip.coat} strokeLinejoin="round" strokeLinecap="round">
          <Path d={TAIL} strokeWidth={30} fill="none" />
          <Path d={EAR_LEFT} strokeWidth={17.5} />
          <Path d={EAR_RIGHT} strokeWidth={17.5} />
          <Path d={BODY_PATH} strokeWidth={17.5} />
          <Ellipse cx={66} cy={178} rx={16} ry={10.5} strokeWidth={17.5} />
          <Ellipse cx={134} cy={178} rx={16} ry={10.5} strokeWidth={17.5} />
          <Path d={arm.l} strokeWidth={33} fill="none" />
          <Path d={arm.r} strokeWidth={33} fill="none" />
          <Circle cx={arm.lp[0]} cy={arm.lp[1]} r={11.5} strokeWidth={17.5} />
          <Circle cx={arm.rp[0]} cy={arm.rp[1]} r={11.5} strokeWidth={17.5} />
          <Ellipse cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry} strokeWidth={17.5} />
        </G>
      ) : null}

      {/* Tail, behind everything. Same two-stroke trick as the limbs.
          Tucked tight against the haunch: swung further out it stops reading as
          part of the animal and starts looking like a separate object lying on
          the floor beside him. */}
      <G>
        <Path
          d={TAIL} stroke={pip.ink} strokeWidth={18} strokeLinecap="round" fill="none"
        />
        <Path
          d={TAIL} stroke={pip.coat} strokeWidth={10.5} strokeLinecap="round" fill="none"
        />
      </G>

      {/* Ears sit behind the head so the head's own outline closes over them. */}
      <Path d={EAR_LEFT} fill={pip.patch} stroke={pip.ink} strokeWidth={5.5} strokeLinejoin="round" />
      <Path d={EAR_RIGHT} fill={pip.patch} stroke={pip.ink} strokeWidth={5.5} strokeLinejoin="round" />

      {/* Body, then everything that lives inside it, then the arms on top. */}
      <Path d={BODY_PATH} fill={pip.coat} stroke={pip.ink} strokeWidth={5.5} strokeLinejoin="round" />
      <G clipPath="url(#pip-body)">
        {/* Shading is a big off-centre CIRCLE, not a wedge. Any flat fill has a
            hard edge; the only question is whether that edge follows the form.
            A circle overhanging the right flank leaves a crescent whose edge
            curves with the body and reads as a shadow — the first draft's
            straight-sided wedge left a vertical line down the middle that read
            as a seam splitting him in two. */}
        <Ellipse cx={152} cy={150} rx={58} ry={62} fill={pip.coatShade} opacity={0.5} />
        <Path d={BODY_PATCH} fill={pip.patch} />
      </G>

      {/* Hind paws, set wide so they stay visible outside the front pair. */}
      <Ellipse cx={66} cy={178} rx={16} ry={10.5} fill={pip.coat} stroke={pip.ink} strokeWidth={4.5} />
      <Ellipse cx={134} cy={178} rx={16} ry={10.5} fill={pip.coat} stroke={pip.ink} strokeWidth={4.5} />

      {limb(arm.l)}
      {limb(arm.r)}

      {/* The phone is the one part of Pip painted in the product's own accent,
          which is what stops him reading as a sticker borrowed from elsewhere. */}
      {pose === 'phone' ? (
        <G transform="rotate(-6 100 142)">
          <Rect
            x={82} y={122} width={36} height={50} rx={8}
            fill={c.accent} stroke={pip.ink} strokeWidth={4.5}
          />
          {/* A lit screen inside the case. Without it the phone is a purple
              lozenge; the inset rectangle is the only cue that says "device". */}
          <Rect x={89} y={130} width={22} height={32} rx={5} fill={pip.coat} opacity={0.34} />
        </G>
      ) : null}

      {paw(arm.lp)}
      {paw(arm.rp)}

      {/* Head last: its outline crossing the chest reads as a jaw. */}
      <Ellipse
        cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry}
        fill={pip.coat} stroke={pip.ink} strokeWidth={5.5}
      />
      {/* One flat patch, no offset shadow copy. The second pass was meant to add
          depth and instead drew a parallel edge a few units inside the first,
          which at any real size looks like a printing misregistration. */}
      <G clipPath="url(#pip-head)">
        <Path d={HEAD_PATCH} fill={pip.patch} />
      </G>

      <Face pose={pose} ink={pip.ink} coat={pip.coat} />
    </Svg>
  );
}

/**
 * Glasses, eyes, nose.
 *
 * The glasses are the silhouette cue — at 72pt the ears and the round spectacles
 * are the only two things still legible, so they carry the whole identity and
 * are drawn at a weight that survives being shrunk.
 */
function Face({ pose, ink, coat }: { pose: PipPose; ink: string; coat: string }) {
  const eyeY = 74;
  const lens = (cx: number) => (
    <Circle cx={cx} cy={eyeY} r={18} fill={coat} fillOpacity={0.35} stroke={ink} strokeWidth={4.5} />
  );

  /** `cheer` and `rest` both close the eyes — upward for joy, downward for calm. */
  const closed = pose === 'cheer' || pose === 'rest';
  const bend = pose === 'cheer' ? -9 : 7;

  const eye = (cx: number) =>
    closed ? (
      <Path
        d={`M ${cx - 8},${eyeY} Q ${cx},${eyeY + bend} ${cx + 8},${eyeY}`}
        stroke={ink} strokeWidth={4.5} strokeLinecap="round" fill="none"
      />
    ) : (
      <Ellipse cx={cx} cy={eyeY} rx={6.5} ry={8.5} fill={ink} />
    );

  return (
    <G>
      {/* Temple arms first, so the lenses sit on top of where they join. */}
      <Path d="M 61,71 L 49,67" stroke={ink} strokeWidth={4} strokeLinecap="round" />
      <Path d="M 139,71 L 151,67" stroke={ink} strokeWidth={4} strokeLinecap="round" />
      {lens(79)}
      {lens(121)}
      <Path d="M 97,72 L 103,72" stroke={ink} strokeWidth={4} strokeLinecap="round" />
      {eye(79)}
      {eye(121)}

      <Ellipse cx={100} cy={100} rx={8} ry={6} fill={ink} />
      <Path
        d="M 100,106 C 100,113 92,114 88,109"
        stroke={ink} strokeWidth={3.5} strokeLinecap="round" fill="none"
      />
    </G>
  );
}
