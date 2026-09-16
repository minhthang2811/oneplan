import type { Dict } from './en';

/**
 * Vietnamese.
 *
 * Typed as `Dict`, so this file cannot compile while a key is missing, extra or
 * misspelled. That check is the point of the whole arrangement — it is what a
 * runtime-fallback i18n library cannot give.
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
    title: 'Màn hình đó không tải được',
    body: 'Kế hoạch của bạn vẫn an toàn — nó được lưu trên máy này. Bạn có thể thử lại.',
  },

  today: {
    a11yProgress: 'Đã xong {done} trên {total}',
    prevDay: 'Ngày trước',
    nextDay: 'Ngày sau',
    jumpToToday: '{weekday}, {date}. Chạm để về hôm nay.',
    dayOptions: 'Tuỳ chọn ngày',
    addActivity: 'Thêm hoạt động',
    compactLayout: 'Bố cục gọn',
    timelineLayout: 'Bố cục dòng thời gian',
    emptyTitle: 'Chưa có gì ở đây',
    emptyBody: 'Thêm một việc bạn muốn hoàn thành. Một việc là đủ để bắt đầu một ngày.',
    anytimeHint: 'Bất cứ việc gì hợp với hôm nay',
    slotCount: { one: '{label}, {count} hoạt động', other: '{label}, {count} hoạt động' },
  },

  todo: {
    title: 'Việc cần làm',
    addTodo: 'Thêm việc cần làm',
    high: 'Cao',
    medium: 'Vừa',
    low: 'Thấp',
    plain: 'Cần làm',
    hintHigh: 'Cần tập trung — thêm vào đây',
    hintMedium: 'Không gấp — thêm vào đây',
    hintLow: 'Không vội — thêm vào đây',
    hintPlain: 'Thêm vào danh sách của bạn',
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
    pickLength: 'Chọn khoảng thời gian bạn muốn biến mất',
    range: '{from} → {to}',
    endsAtLong: 'Kết thúc lúc {to}',
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
    endMessage: 'Còn {time}.',
    keepGoing: 'Tiếp tục làm',
    paused: 'ĐANG TẠM DỪNG',
    steps: 'CÁC BƯỚC',
    allDone: 'Xong hết rồi 🎉',
    timeUp: 'Hết giờ. Việc đó được tính.',
    markItDone: 'Đánh dấu đã xong',
    notYet: 'Chưa đâu',
  },

  me: {
    title: 'Tôi',
    hereTo: 'Ở đây để {need}',
    doneToday: 'Xong hôm nay',
    ofTotal: 'trên {total}',
    planned: 'Đã lên kế hoạch',
    todaySub: 'hôm nay',
    activities: 'Hoạt động',
    totalSub: 'tổng cộng',
    planning: 'Lên kế hoạch',
    dayLayout: 'Bố cục ngày',
    compact: 'Gọn',
    timeline: 'Dòng thời gian',
    routines: 'Thói quen',
    routinesNone: 'Chưa đặt',
    routineSummary: { one: '{count} bước · {slots} trên 3', other: '{count} bước · {slots} trên 3' },
    reminders: 'Nhắc nhở',
    remindersOff: 'Tắt',
    remindersAsStart: 'Ngay khi bắt đầu',
    remindersBefore: 'Trước {duration}',
    about: 'Giới thiệu',
    appearance: 'Giao diện',
    followsSystem: 'Theo hệ thống',
    yourData: 'Dữ liệu của bạn',
    onThisDevice: 'Trên máy này',
    runOnboarding: 'Chạy lại phần giới thiệu',
    version: 'Oneplan 1.0',
    notifOffTitle: 'Thông báo đang tắt',
    notifOffBody:
      'Cho phép Oneplan gửi thông báo trong Cài đặt để được nhắc khi một hoạt động bắt đầu.',
    startOverTitle: 'Chạy lại phần giới thiệu?',
    startOverBody: 'Hoạt động, giao diện và cài đặt nhắc nhở của bạn vẫn được giữ.',
    startOver: 'Bắt đầu lại',
  },

  language: {
    title: 'Ngôn ngữ',
    row: 'Ngôn ngữ',
    system: 'Hệ thống',
    systemSub: 'Theo ngôn ngữ điện thoại',
    footnote:
      'Oneplan mở bằng ngôn ngữ của điện thoại khi có thể. Chọn một ngôn ngữ ở đây để thay thế.',
  },

  routines: {
    title: 'Thói quen',
    subtitle:
      'Những phần lặp lại trong ngày của bạn. Đổi nội dung, đổi thứ tự, và đổi giờ bắt đầu.',
    none: 'Chưa có thói quen nào',
    nothingPicked: 'Chưa chọn gì',
    nothingPickedLower: 'chưa chọn gì',
    summary: { one: '{count} bước · {duration} · {time}', other: '{count} bước · {duration} · {time}' },
    a11ySummary: { one: '{count} bước, khoảng {duration}, bắt đầu lúc {time}', other: '{count} bước, khoảng {duration}, bắt đầu lúc {time}' },
    a11yRow: 'Thói quen {slot}, {summary}',
    startPrompt: 'Thói quen {slot} của bạn bắt đầu lúc nào?',
    inThisRoutine: 'Trong thói quen này',
    orderFooter: 'Chạm vào mũi tên để đổi thứ tự các việc.',
    emptyList: 'Chưa có gì ở đây. Chọn từ danh sách bên dưới.',
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
      'Thay đổi áp dụng cho hôm nay ngay lập tức. Những gì bạn đã đánh dấu xong vẫn giữ nguyên.',
    emptyHint:
      'Mở một buổi bên dưới và chọn những việc bạn vốn đã làm. Một hoặc hai là đủ.',
  },

  appearance: {
    title: 'Giao diện',
    subtitle:
      'Oneplan theo thiết bị của bạn mặc định. Chọn một bên nếu bạn không muốn nó tự đổi.',
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
      'Một lời nhắc trước khi hoạt động bắt đầu, để kế hoạch nhớ thay cho bạn.',
    switchedOff: 'Nhắc nhở đã bị tắt',
    notifications: 'Thông báo',
    systemPermission: 'Quyền hệ thống',
    checking: 'Đang kiểm tra…',
    allowed: 'Đã cho phép',
    notAllowed: 'Chưa cho phép',
    activityReminders: 'Nhắc nhở hoạt động',
    nothingWithTimes:
      'Chưa có gì được lên lịch — nhắc nhở gắn với hoạt động có giờ bắt đầu, và bạn chưa có hoạt động nào như vậy.',
    nothingToday:
      'Hiện chưa có gì được lên lịch. Mọi hoạt động có giờ bắt đầu hôm nay đều đã bắt đầu.',
    when: 'Khi nào',
    whenFooter: 'Tính từ giờ bắt đầu của chính hoạt động đó.',
    tenHint: 'Đủ thời gian để làm nốt việc đang dở',
    asItStarts: 'Ngay khi bắt đầu',
    before: 'Trước {duration}',
    switchedOffBody:
      'Thông báo cho Oneplan đã bị tắt trong Cài đặt iOS, nên ứng dụng ngừng hứa những lời nhắc mà nó không gửi được. Cho phép lại để bật tính năng này.',
    privacyNote:
      'Nhắc nhở được lên lịch trên máy này. Không có gì về kế hoạch của bạn được gửi đi đâu cả.',
  },

  celebration: {
    morning: 'Xong buổi sáng.\nPhần còn lại đợi được.',
    afternoon: 'Xong buổi chiều.\nLàm tốt lắm.',
    evening: 'Xong buổi tối.\nBạn dừng được rồi.',
    badge: 'XONG {slot}',
    a11y: 'Đã xong {slot}. Mọi hoạt động trong {slotLower} của bạn đều hoàn tất.',
  },

  add: {
    newActivity: 'Hoạt động mới',
    newTodo: 'Việc cần làm mới',
    placeholderActivity: 'Bạn đang làm gì?',
    placeholderTodo: 'Cần làm gì?',
    chooseIcon: 'Chọn biểu tượng',
    icon: 'Biểu tượng',
    iconA11y: 'Biểu tượng {emoji}',
    colour: 'Màu',
    colourA11y: 'Màu {name}',
    quickPick: 'Chọn nhanh',
    howLong: 'Trong bao lâu',
    when: 'Khi nào',
    startsAt: 'Bắt đầu lúc',
    noSetTime: 'Không đặt giờ',
    tag: 'Nhãn',
    steps: 'Các bước',
    stepPlaceholder: 'Chia nhỏ thành các bước',
    removeStep: 'Xoá bước {title}',
    addActivity: 'Thêm hoạt động',
    discardTitle: 'Bỏ hoạt động này?',
    discardBody: 'Nó chưa được thêm vào.',
    discardAction: 'Bỏ hoạt động',
    discard: 'Bỏ',
    keepEditing: 'Tiếp tục sửa',
  },

  task: {
    goneTitle: 'Hoạt động này không còn nữa',
    goneBody: 'Nó đã bị xoá, hoặc liên kết đã cũ.',
    backToToday: 'Về hôm nay',
    deleteActivity: 'Xoá hoạt động',
    steps: 'CÁC BƯỚC',
    noStepsTitle: 'Chưa có bước nào',
    noStepsBody: 'Chia việc này thành hai hoặc ba bước thường khiến việc bắt đầu dễ hơn.',
    addStep: 'Thêm một bước',
    remove: 'Xoá {title}',
    markDone: 'Đánh dấu đã xong',
    markNotDone: 'Đánh dấu chưa xong',
    focus: 'Tập trung',
  },

  onboarding: {
    stepOf: 'Bước {step} trên {total}',
    welcomeBody:
      'Mỗi lần một ngày, bày ra để bạn nhìn thấy được. Dành cho những bộ não hợp với hình ảnh hơn là danh sách.',
    getStarted: 'Bắt đầu',
    noAccount: 'Không cần tài khoản. Mọi thứ ở lại trên điện thoại của bạn.',

    needTitle: 'Bạn cần gì\nnhất lúc này?',
    needSubtitle:
      'Để chúng tôi đặt đúng thứ lên màn hình đầu tiên của bạn. Bạn có thể đổi sau.',
    needOrganise: 'Sắp xếp ngày và thời gian của tôi',
    needRemember: 'Nhớ giúp các việc của tôi',
    needPrioritise: 'Ưu tiên các việc cần làm',
    needRoutines: 'Xây dựng và giữ thói quen',
    needFocus: 'Hỗ trợ làm việc tập trung',

    rhythmTitle: 'Bạn thích lên kế hoạch\ncho một ngày thế nào?',
    rhythmSubtitle:
      'Có ngày cần thời khoá biểu, có ngày chỉ cần một thứ tự. Chọn thứ thường hợp với bạn.',
    rhythmLoose: 'Thoải mái — sáng, chiều, tối',
    rhythmTimed: 'Theo giờ — mọi thứ đúng lịch',
    rhythmBoth: 'Một chút của cả hai',

    routinesMorningTitle: 'Một buổi sáng\ntốt lành diễn ra sao?',
    routinesMorningSubtitle:
      'Chọn những việc bạn vốn đã làm. Chúng tôi sẽ giữ đúng thứ tự này để bạn không phải nhớ.',
    routinesAfternoonTitle: 'Điều gì giữ cho\nbuổi chiều trôi chảy?',
    routinesAfternoonSubtitle:
      'Giữa ngày là lúc các kế hoạch lặng lẽ đổ vỡ. Một vài điểm tựa là đủ.',
    routinesEveningTitle: 'Ngày của bạn\nlắng lại thế nào?',
    routinesEveningSubtitle:
      'Buổi tối chạy theo quán tính cho đến khi không còn vậy nữa. Chọn thứ bạn muốn kế hoạch nhớ giúp.',
    routinesCta: 'Tiếp tục với thói quen của tôi',
    routinesEmpty: 'Chọn nhiều hay ít tuỳ bạn — bạn có thể bỏ qua phần này.',
    routinesPicked: 'Đã chọn {count} · khoảng {duration}',

    remindersTitle: 'Một lời nhắc ngay\ntrước khi bạn bắt đầu',
    remindersSubtitle:
      'Oneplan có thể báo cho bạn vài phút trước một hoạt động, để kế hoạch nhớ thay cho bạn.',
    remindersCta: 'Bật nhắc nhở',
    remindersSkip: 'Không phải bây giờ',
    remindersBrand: 'ONEPLAN',
    remindersPreview1Title: 'Thói quen buổi sáng',
    remindersPreview1Title2: 'Ăn trưa',
    remindersPreview2Title: 'Ăn trưa',
    remindersPreview2Body: 'Sắp tới lúc 12:30',

    readyTitle: 'Ngày của bạn\nđã sẵn sàng để xem',
    readySubtitle:
      'Chúng tôi đã đặt sẵn một ngày khởi đầu cho bạn. Đổi gì cũng được, xoá gì cũng được — nó là của bạn.',
    readyCta: 'Bắt đầu lên kế hoạch',
    readyBubble: 'Nào. Cùng xem thử nhé.',
  },

  notification: {
    startingNow: 'Bắt đầu ngay. Mất {duration}.',
    startsIn: 'Bắt đầu sau {lead}. Mất {duration}.',
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
    bed: 'Dọn giường',
    'teeth-am': 'Đánh răng',
    shower: 'Tắm',
    dressed: 'Thay đồ',
    'meds-am': 'Uống thuốc',
    breakfast: 'Ăn sáng',
    coffee: 'Uống cà phê',
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
    move: 'Vận động cơ thể',
    errands: 'Việc vặt',
    breathe: 'Nghỉ lấy hơi',
    call: 'Gọi cho ai đó',
    review: 'Nhìn lại một ngày',

    dinner: 'Ăn tối',
    tidy: 'Dọn dẹp',
    dishes: 'Rửa bát',
    'teeth-pm': 'Đánh răng',
    skincare: 'Chăm sóc da',
    'meds-pm': 'Uống thuốc',
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
