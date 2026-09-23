import type { Dict } from './en';

/**
 * Vietnamese.
 *
 * Typed as `Dict`, so this file cannot compile while a key is missing, extra or
 * misspelled. That check is the point of the whole arrangement — it is what a
 * runtime-fallback i18n library cannot give.
 *
 * ── THIS IS NOT A TRANSLATION OF `en.ts`, AND MUST NOT BECOME ONE ─────────
 *
 * It was one, and that was the problem. Every sentence was grammatical and the
 * whole file still read like a manual: it said `chúng tôi` — the corporate
 * "we" — and it carried almost no sentence-final particles. Those particles
 * (`nhé`, `nha`, `thôi`, `rồi`, `mà`, `đó`, `nào`) are most of what separates
 * a Vietnamese person talking from a Vietnamese instruction sheet. Compare
 * "Bạn có thể thử lại." with "Thử lại nhé." — same instruction, and only one
 * of them sounds like it came from someone who likes you.
 *
 * The rules, in order of how much damage breaking them does:
 *
 * 1. **Pupu speaks; a company never does.** There is no `chúng tôi` in this
 *    file and there must not be one. Where English says "we", name Pupu or
 *    drop the subject — Vietnamese is happy without one.
 * 2. **End sentences the way people end them.** A particle is not decoration;
 *    it is the tone. Prefer one at the end of anything reassuring, inviting or
 *    optional. Leave them off destructive confirmations, which should be flat.
 * 3. **Do not translate the English literary lines.** Several were images that
 *    only work in English ("plans quietly collapse", "that counted") and came
 *    out stiff and slightly odd. Write the Vietnamese sentence a Vietnamese
 *    writer would have written for that moment instead, even if it says
 *    something different.
 * 4. **Shrink the task, never the person.** "Chỉ {duration} thôi" and "nhỏ xíu
 *    cũng được" lower the cost of starting. Nothing here scolds, and nothing
 *    congratulates someone for a thing they did not do.
 * 5. **Leave tomorrow's door open.** The evening celebration ends with "mai
 *    tính tiếp nhé" on purpose: the last thing said each day should be an
 *    invitation back, not a full stop.
 *
 * NOTES FOR FUTURE TRANSLATORS
 *
 * - Vietnamese has NO grammatical plural. Every `{ one, other }` pair here is
 *   deliberately the same sentence; the shape is kept only so the catalogues
 *   stay structurally identical.
 * - The `duration.short*` keys use the tight `p`/`g` (phút/giờ) forms, for the
 *   places too narrow to spell the unit out — a 56pt preset chip, a stat tile.
 *   Everywhere else duration is spelled in full, because "1 giờ 30 phút" is how
 *   the length of a task is actually said.
 * - `date.long` reorders to day-then-month, which is the Vietnamese convention;
 *   `Intl` already returns the month as "tháng 1", so the word is not repeated
 *   here.
 */
export const vi: Dict = {
  common: {
    cancel: 'Huỷ',
    add: 'Thêm',
    done: 'Xong',
    skip: 'Bỏ qua',
    back: 'Quay lại',
    continue: 'Tiếp tục',
    delete: 'Xoá',
    notNow: 'Để sau',
    openSettings: 'Mở Cài đặt',
    tryAgain: 'Thử lại',
  },

  duration: {
    m: '{m} phút',
    h: '{h} giờ',
    hm: '{h} giờ {m} phút',
    shortM: '{m}p',
    shortH: '{h}g',
    shortHm: '{h}g{m}',
  },

  /**
   * "15 tháng 9, 2026" — day first, and the month word spelled HERE rather than
   * taken from `Intl`.
   *
   * `Intl` returns the standalone form, "Tháng 9", which is what a calendar
   * header would say. In a date the word is a common noun and is lowercase, so
   * this template takes `{monthNum}` and writes "tháng" itself. That also keeps
   * the casing out of the formatting code, where it would have been a
   * per-language branch.
   */
  date: {
    long: '{day} tháng {monthNum}, {year}',
  },

  tabs: {
    todo: 'Cần làm',
    today: 'Hôm nay',
    focus: 'Tập trung',
    me: 'Tôi',
  },

  slot: {
    anytime: 'Bất kỳ',
    morning: 'Buổi sáng',
    afternoon: 'Buổi chiều',
    evening: 'Buổi tối',
  },

  error: {
    title: 'Màn hình này hơi trục trặc',
    body: 'Kế hoạch của bạn vẫn nguyên vẹn trong máy, không mất gì đâu. Thử lại nhé.',
  },

  today: {
    a11yProgress: 'Đã xong {done} trên {total}',
    prevDay: 'Ngày trước',
    nextDay: 'Ngày sau',
    jumpToToday: '{weekday}, {date}. Chạm để về hôm nay.',
    dayOptions: 'Xem ngày kiểu nào?',
    addActivity: 'Thêm hoạt động',
    /**
  * `Bố cục` and `dòng thời gian` are both correct and both are the register of
  * a design tool rather than of a day. Nobody asks how their morning's LAYOUT
  * is arranged. These name the two ways of LOOKING at a day instead, and
  * `theo giờ` deliberately echoes `rhythmTimed` in onboarding — the user has
  * already been asked this question once, in those words.
  */
    compactLayout: 'Xem kiểu gọn',
    timelineLayout: 'Xem theo giờ',
    emptyTitle: 'Hôm nay còn trống trơn',
    emptyBody: 'Thêm một việc thôi, nhỏ xíu cũng được. Một việc là đủ để ngày hôm nay bắt đầu rồi.',
    anytimeHint: 'Việc gì cũng được, miễn hợp hôm nay',
    slotCount: { one: '{label}, {count} hoạt động', other: '{label}, {count} hoạt động' },
    overdueCount: {
      one: '{count} việc còn dang dở từ hôm trước',
      other: '{count} việc còn dang dở từ những hôm trước',
    },
    moveToToday: 'Chuyển sang hôm nay',
    moveAllTitle: {
      one: 'Chuyển {count} việc sang hôm nay?',
      other: 'Chuyển cả {count} việc sang hôm nay?',
    },
    moveAllBody: 'Vẫn giữ nguyên buổi trong ngày. Đổi ý lúc nào cũng được nhé.',
  },

  todo: {
    title: 'Việc cần làm',
    addTodo: 'Thêm việc cần làm',
    high: 'Cao',
    medium: 'Vừa',
    low: 'Thấp',
    plain: 'Cần làm',
    hintHigh: 'Việc cần tập trung thì thả vào đây',
    hintMedium: 'Không gấp lắm thì để đây',
    hintLow: 'Không vội gì cả, cứ để đây',
    hintPlain: 'Cứ thêm vào danh sách của bạn',
  },

  row: {
    now: 'BÂY GIỜ',
    a11y: '{title}, {duration}',
    a11yCompleted: '{title}, {duration}, đã xong',
    markDone: 'Đánh dấu đã xong',
    markNotDone: 'Đánh dấu chưa xong',
    startFocusOn: 'Bắt đầu tập trung cho {title}',
    stepsDone: 'Đã xong {done} trên {total} bước',
  },

  focus: {
    title: 'Tập trung',
    alarmTitle: 'Hết giờ rồi',
    alarmBody: 'Xong một phiên tập trung. Nghỉ một chút nhé.',
    setLength: 'Đặt độ dài',
    pickLength: 'Bạn muốn biến mất trong bao lâu?',
    endsAt: 'Kết thúc lúc {time}',
    minutes: { one: 'PHÚT', other: 'PHÚT' },
    dialLabel: 'Độ dài phiên tập trung',
    start: 'Bắt đầu',
    startA11y: 'Bắt đầu phiên tập trung {duration}',
    addMinute: '+ 1 phút',
    addMinuteA11y: 'Thêm một phút',
    pause: 'Tạm dừng',
    resume: 'Tiếp tục',
    end: 'Kết thúc',
    endSession: 'Kết thúc phiên',
    endTitle: 'Kết thúc phiên tập trung này?',
    endMessage: 'Vẫn còn {time} nữa mà.',
    keepGoing: 'Làm tiếp',
    paused: 'TẠM DỪNG',
    steps: 'CÁC BƯỚC',
    allDone: 'Xong hết rồi 🎉',
    timeUp: 'Hết giờ rồi. Bấy nhiêu cũng là quý rồi đó.',
    markItDone: 'Đánh dấu đã xong',
    notYet: 'Chưa đâu',
  },

  me: {
    title: 'Tôi',
    /**
     * `Here to {need}` is a subjectless English frame, and copying it gives
     * "Ở đây để … của tôi" — the app's voice and the user's own answer welded
     * into one sentence. `Đang` takes the frame's place: the subject stays
     * implied (it is Pupu doing the organising, the remembering), the answer's
     * `của tôi` still belongs to the user, and the lowercased fragment the
     * screen hands over reads correctly after it.
     */
    hereTo: 'Đang {need}',
    doneToday: 'Xong hôm nay',
    ofTotal: 'trên {total}',
    planned: 'Kế hoạch',
    todaySub: 'hôm nay',
    activities: 'Hoạt động',
    totalSub: 'tổng cộng',
    planning: 'Lên kế hoạch',
    dayLayout: 'Cách xem ngày',
    compact: 'Kiểu gọn',
    timeline: 'Theo giờ',
    routines: 'Thói quen',
    routinesNone: 'Chưa đặt',
    routineSummary: { one: '{count} bước · {slots} trên 3', other: '{count} bước · {slots} trên 3' },
    reminders: 'Nhắc nhở',
    remindersOff: 'Tắt',
    remindersAsStart: 'Ngay khi bắt đầu',
    remindersBefore: 'Trước {duration}',
    /**
  * `Ứng dụng`, NOT `Giới thiệu`, even though the English is "About".
  *
  * This section holds Language, Appearance, Your data and "run onboarding
  * again" — and that last row is already called `phần giới thiệu`. A section
  * headed `GIỚI THIỆU` containing a row that says `Làm lại phần giới thiệu`
  * reads as though the heading and the row are about the same thing, which
  * they are not.
  */
    about: 'Ứng dụng',
    appearance: 'Giao diện',
    followsSystem: 'Theo hệ thống',
    yourData: 'Dữ liệu của bạn',
    onThisDevice: 'Trên máy này',
    runOnboarding: 'Làm lại phần giới thiệu',
    version: 'Pupu 1.0',
    notifOffTitle: 'Thông báo đang tắt',
    notifOffBody:
      'Bật thông báo cho Pupu trong Cài đặt, để Pupu hích nhẹ bạn mỗi khi tới giờ nhé.',
    startOverTitle: 'Làm lại phần giới thiệu?',
    startOverBody: 'Hoạt động, giao diện và cài đặt nhắc nhở của bạn vẫn giữ nguyên.',
    startOver: 'Bắt đầu lại',
  },

  language: {
    title: 'Ngôn ngữ',
    row: 'Ngôn ngữ',
    system: 'Hệ thống',
    systemSub: 'Theo ngôn ngữ điện thoại',
    footnote:
      'Pupu mở bằng ngôn ngữ của điện thoại khi có thể. Muốn khác thì chọn ở đây nhé.',
  },

  routines: {
    title: 'Thói quen',
    subtitle:
      'Những việc lặp đi lặp lại trong ngày của bạn. Đổi nội dung, đổi thứ tự, đổi cả giờ bắt đầu.',
    none: 'Chưa có thói quen nào',
    nothingPicked: 'Chưa chọn gì',
    nothingPickedLower: 'chưa chọn gì',
    summary: { one: '{count} bước · {duration} · {time}', other: '{count} bước · {duration} · {time}' },
    a11ySummary: { one: '{count} bước, khoảng {duration}, bắt đầu lúc {time}', other: '{count} bước, khoảng {duration}, bắt đầu lúc {time}' },
    a11yRow: 'Thói quen {slot}, {summary}',
    startPrompt: 'Thói quen {slot} của bạn bắt đầu lúc nào?',
    addSomething: 'Thêm một việc',
    editStepA11y: '{title}, {duration}. Chạm để đổi.',
    stepName: 'Tên bước',
    stepPlaceholder: 'Bước này là gì?',
    stepLength: 'Bao lâu',
    resetStep: 'Đặt lại bước này',
    inThisRoutine: 'Trong thói quen này',
    orderFooter: 'Chạm vào mũi tên để đổi thứ tự các việc.',
    emptyList: 'Chưa có gì ở đây cả. Chọn từ danh sách bên dưới nhé.',
    moveEarlier: 'Chuyển {title} lên trước',
    moveLater: 'Chuyển {title} xuống sau',
    remove: 'Xoá {title}',
    startsAt: 'Bắt đầu lúc',
    startTime: 'Giờ bắt đầu',
    a11yStartTime: 'Giờ bắt đầu, {time}',
    ownPlaceholder: 'Một việc của riêng bạn',
    addOwn: 'Thêm bước của riêng bạn',
    addStep: 'Thêm bước',
    applyNote:
      'Sửa xong là hôm nay đổi theo luôn. Việc nào đã đánh dấu xong thì vẫn nguyên đó nhé.',
    emptyHint:
      'Mở một buổi bên dưới rồi chọn vài việc bạn vốn vẫn làm. Một hai việc là đủ rồi.',
  },

  appearance: {
    title: 'Giao diện',
    subtitle:
      'Mặc định thì Pupu đi theo máy của bạn. Muốn cố định một bên thì chọn ở đây nhé.',
    theme: 'Chủ đề',
    system: 'Hệ thống',
    systemHint: 'Theo thiết bị của bạn',
    light: 'Sáng',
    lightHint: 'Luôn sáng',
    dark: 'Tối',
    darkHint: 'Luôn tối',
  },

  reminderSettings: {
    title: 'Nhắc nhở',
    subtitle:
      'Một lời nhắc nhỏ trước giờ, để kế hoạch nhớ thay cho bạn.',
    switchedOff: 'Nhắc nhở đã bị tắt',
    notifications: 'Thông báo',
    systemPermission: 'Quyền hệ thống',
    checking: 'Đang kiểm tra…',
    allowed: 'Đã cho phép',
    notAllowed: 'Chưa cho phép',
    notAsked: 'Chưa được hỏi',
    askFailed: 'Pupu chưa hỏi được quyền thông báo lúc này. Hãy thử bật công tắc lần nữa.',
    activityReminders: 'Nhắc nhở hoạt động',
    nothingWithTimes:
      'Chưa có lời nhắc nào cả — lời nhắc chỉ gắn được vào việc có giờ bắt đầu, mà giờ thì chưa việc nào của bạn có giờ.',
    nothingToday:
      'Không còn lời nhắc nào đang chờ. Hôm nay việc nào có giờ thì cũng qua giờ cả rồi.',
    when: 'Khi nào',
    whenFooter: 'Tính từ giờ bắt đầu của chính hoạt động đó.',
    tenHint: 'Đủ thời gian để làm nốt việc đang dở',
    asItStarts: 'Ngay khi bắt đầu',
    before: 'Trước {duration}',
    scheduledCount: {
      one: 'Đã lên lịch {count} lời nhắc.',
      other: 'Đã lên lịch {count} lời nhắc.',
    },
    preview: 'Lời nhắc trông thế này',
    previewA11y: 'Thông báo mẫu. {title}. {body}',
    switchedOffBody:
      'Thông báo cho Pupu đang tắt trong Cài đặt iOS, nên Pupu không dám hứa những lời nhắc mà chính mình không gửi được. Bật lại để dùng tiếp nhé.',
    privacyNote:
      'Lời nhắc hẹn ngay trong máy bạn thôi. Không có gì về kế hoạch của bạn rời khỏi máy cả.',
  },

  celebration: {
    morning: 'Xong buổi sáng rồi.\nPhần còn lại đợi được mà.',
    afternoon: 'Xong buổi chiều rồi.\nBạn làm tốt lắm đó.',
    evening: 'Xong buổi tối rồi.\nNghỉ thôi, mai tính tiếp nhé.',
    badge: 'XONG {slot}',
    a11y: 'Đã xong {slot}. Mọi hoạt động trong {slotLower} của bạn đều hoàn tất.',
  },

  add: {
    newActivity: 'Hoạt động mới',
    newTodo: 'Việc cần làm mới',
    placeholderActivity: 'Bạn định làm gì?',
    placeholderTodo: 'Cần làm gì nào?',
    chooseIcon: 'Chọn biểu tượng',
    icon: 'Biểu tượng',
    iconA11y: 'Biểu tượng {emoji}',
    colour: 'Màu',
    colourA11y: 'Màu {name}',
    quickPick: 'Chọn nhanh',
    howLong: 'Bao lâu',
    when: 'Khi nào',
    startsAt: 'Bắt đầu lúc',
    noSetTime: 'Không đặt giờ',
    tag: 'Nhãn',
    steps: 'Các bước',
    stepPlaceholder: 'Chia nhỏ thành các bước',
    removeStep: 'Xoá bước {title}',
    addActivity: 'Thêm hoạt động',
    discardTitle: 'Bỏ hoạt động này?',
    discardBody: 'Chưa thêm vào đâu, yên tâm.',
    discardAction: 'Bỏ hoạt động',
    discard: 'Bỏ',
    keepEditing: 'Tiếp tục sửa',
  },

  task: {
    goneTitle: 'Hoạt động này không còn nữa',
    goneBody: 'Chắc là nó bị xoá rồi, hoặc liên kết đã cũ quá.',
    backToToday: 'Về hôm nay',
    deleteActivity: 'Xoá hoạt động',
    steps: 'CÁC BƯỚC',
    noStepsTitle: 'Chưa có bước nào',
    noStepsBody: 'Chia nhỏ thành hai ba bước, tự nhiên thấy dễ bắt đầu hơn hẳn.',
    addStep: 'Thêm một bước',
    remove: 'Xoá {title}',
    markDone: 'Đánh dấu đã xong',
    markNotDone: 'Đánh dấu chưa xong',
    focus: 'Tập trung',

    edit: 'Sửa',
    editA11y: '{field}: {value}. Chạm để đổi.',
    renameTitle: 'Đổi tên hoạt động',
    renamePlaceholder: 'Bạn định làm gì?',
    duration: 'Bao lâu',
    whenSlot: 'Buổi trong ngày',
    startsAt: 'Bắt đầu lúc',
    noSetTime: 'Không đặt giờ',
    tagField: 'Nhãn',
    noTag: 'Không có nhãn',
    moveTitle: 'Chuyển sang',
    moveToday: 'Hôm nay',
    moveTomorrow: 'Ngày mai',
    moveInbox: 'Danh sách việc cần làm',
    dateField: 'Ngày',
    inboxValue: 'Danh sách việc cần làm',
    priority: 'Mức ưu tiên',
    editInRoutines: 'Sửa trong Thói quen',
  },

  onboarding: {
    stepOf: 'Bước {step} trên {total}',
    /**
     * Pupu giới thiệu chính mình, không phải app tự mô tả.
     *
     * `Chào bạn` rather than `Xin chào`: the second is the greeting a voice
     * announcement uses, the first is what a person says walking in. And the
     * promise is put as a favour Pupu is doing — `để đầu bạn nghỉ một chút` —
     * because the English joke ("so your brain doesn't have to") does not
     * survive a literal rendering; the Vietnamese sentence that does the same
     * work is about giving the reader's head a rest.
     */
    welcomeBody:
      'Chào bạn! Kế hoạch hôm nay cứ để Pupu giữ, đầu bạn nghỉ một chút. Mỗi lần một ngày thôi, bày sẵn ra cho dễ nhìn.',
    getStarted: 'Bắt đầu',
    noAccount: 'Không tài khoản, không đăng ký. Mọi thứ nằm yên trong máy bạn.',

    needTitle: 'Bạn cần gì\nnhất lúc này?',
    needSubtitle:
      'Để Pupu bày đúng thứ bạn cần lên màn hình đầu tiên. Đổi lại sau cũng được.',
    needOrganise: 'Sắp xếp ngày và thời gian của tôi',
    needRemember: 'Nhớ giúp các việc của tôi',
    needPrioritise: 'Ưu tiên các việc cần làm',
    needRoutines: 'Xây dựng và giữ thói quen',
    needFocus: 'Hỗ trợ làm việc tập trung',

    rhythmTitle: 'Bạn thích lên kế hoạch\ncho một ngày thế nào?',
    rhythmSubtitle:
      'Có ngày cần thời khoá biểu, có ngày chỉ cần một thứ tự thôi. Chọn kiểu thường hợp với bạn nhé.',
    rhythmLoose: 'Thoải mái',
    rhythmLooseSub: 'Sáng, chiều, tối',
    rhythmTimed: 'Theo giờ',
    rhythmTimedSub: 'Việc nào cũng có giờ',
    rhythmBoth: 'Một chút của cả hai',
    rhythmBothSub: 'Tuỳ hôm',

    routinesMorningTitle: 'Một buổi sáng\ntốt lành diễn ra sao?',
    routinesMorningSubtitle:
      'Chọn những việc bạn vốn vẫn làm. Pupu giữ đúng thứ tự cho, bạn khỏi phải nhớ.',
    routinesAfternoonTitle: 'Điều gì giữ cho\nbuổi chiều trôi chảy?',
    routinesAfternoonSubtitle:
      'Giữa ngày là lúc kế hoạch hay đổ nhất. Vài điểm tựa nhỏ là đủ rồi.',
    routinesEveningTitle: 'Ngày của bạn\nlắng lại thế nào?',
    routinesEveningSubtitle:
      'Buổi tối cứ trôi theo quán tính, ngoảnh lại là hết ngày. Chọn vài việc để Pupu nhắc giúp bạn.',
    routinesCta: 'Tiếp tục với thói quen của tôi',
    routinesEmpty: 'Chọn nhiều hay ít tuỳ bạn — bỏ qua cũng chẳng sao đâu.',
    routinesPicked: 'Đã chọn {count} · khoảng {duration}',

    remindersTitle: 'Một lời nhắc ngay\ntrước khi bạn bắt đầu',
    remindersSubtitle:
      'Pupu sẽ hích nhẹ bạn vài phút trước khi tới giờ, để bạn khỏi phải nhớ.',
    remindersCta: 'Bật nhắc nhở',
    remindersSkip: 'Không phải bây giờ',
    remindersBrand: 'PUPU',
    remindersPreview1Title: 'Thói quen buổi sáng',
    remindersPreview1Title2: 'Ăn trưa',
    remindersPreview2Title: 'Ăn trưa',
    remindersPreview2Body: 'Sắp tới lúc 12:30',

    readyTitle: 'Ngày của bạn\nđã sẵn sàng để xem',
    readySubtitle:
      'Pupu bày sẵn một ngày để bạn khỏi bắt đầu từ trang trắng. Đổi gì, xoá gì cũng được — ngày này là của bạn.',
    readyCta: 'Bắt đầu lên kế hoạch',
    readyBubble: 'Đi thôi, xem thử nào!',
  },

  notification: {
    startingNow: 'Tới giờ rồi. Chỉ {duration} thôi.',
    startsIn: '{lead} nữa là tới giờ. Chỉ {duration} thôi.',
    channel: 'Nhắc nhở hoạt động',
  },

  tag: {
    work: 'Công việc',
    study: 'Học tập',
    health: 'Sức khoẻ',
    selfCare: 'Chăm sóc bản thân',
    household: 'Việc nhà',
    humanNeeds: 'Nhu cầu cơ bản',
    exercise: 'Vận động',
    social: 'Bạn bè',
    admin: 'Giấy tờ',
    hobby: 'Sở thích',
  },

  suggestion: {
    walk: 'Đi dạo',
    email: 'Trả lời email',
    stretch: 'Giãn cơ',
    desk: 'Dọn bàn làm việc',
    call: 'Gọi cho ai đó',
    water: 'Uống nước',
  },

  routine: {
    wake: 'Thức dậy',
    'water-am': 'Uống nước',
    badminton: 'Đánh cầu lông',
    bed: 'Dọn giường',
    'teeth-am': 'Đánh răng',
    shower: 'Tắm',
    dressed: 'Thay đồ',
    'meds-am': 'Uống thuốc',
    breakfast: 'Ăn sáng',
    coffee: 'Uống cà phê',
    incense: 'Thắp hương',
    plants: 'Tưới cây',
    plan: 'Lên kế hoạch cho ngày',
    'stretch-am': 'Giãn cơ',
    commute: 'Đi làm',

    lunch: 'Ăn trưa',
    walk: 'Đi bộ ngoài trời',
    'water-pm': 'Uống nước',
    'deep-work': 'Làm việc sâu',
    email: 'Kiểm tra email',
    snack: 'Ăn nhẹ',
    desk: 'Dọn bàn làm việc',
    trash: 'Đổ rác',
    move: 'Vận động cơ thể',
    errands: 'Việc vặt',
    breathe: 'Nghỉ lấy hơi',
    call: 'Gọi cho ai đó',
    review: 'Nhìn lại một ngày',

    dinner: 'Ăn tối',
    tidy: 'Dọn dẹp',
    dishes: 'Rửa bát',
    laundry: 'Giặt đồ',
    'hang-clothes': 'Phơi đồ',
    'teeth-pm': 'Đánh răng',
    skincare: 'Chăm sóc da',
    'meds-pm': 'Uống thuốc',
    movie: 'Xem phim',
    read: 'Đọc một chương',
    journal: 'Viết nhật ký',
    clothes: 'Chuẩn bị quần áo',
    screens: 'Tắt màn hình',
    alarm: 'Đặt báo thức',
    'wind-down': 'Thư giãn',
  },

  routineParent: {
    morning: 'Thói quen buổi sáng',
    afternoon: 'Nạp lại buổi chiều',
    evening: 'Thói quen buổi tối',
  },

  seed: {
    plan: 'Lên kế hoạch cho ngày',
    morning: 'Thói quen buổi sáng',
    tidy: 'Dọn nhanh',
    work: 'Bắt đầu làm việc',
    water: 'Uống nước',
    lunch: 'Ăn trưa',
    dinner: 'Ăn tối',
    evening: 'Thói quen buổi tối',
    dentist: 'Đặt lịch nha sĩ',
    laundry: 'Giặt đồ',
    stepWake: 'Thức dậy',
    stepTeeth: 'Đánh răng',
    stepBreakfast: 'Ăn sáng',
    stepCoffee: 'Uống cà phê',
    stepTidy: 'Dọn dẹp',
    stepRead: 'Đọc một chương',
  },
};
