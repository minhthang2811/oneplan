/**
 * English — the SOURCE catalogue.
 *
 * This file is the schema: `Dict` is derived from it, every other language is
 * typed as `Dict`, and so a missing or misspelled key in a translation is a
 * BUILD error rather than a runtime fallback. That is the whole reason this app
 * does not use a string-keyed i18n library.
 *
 * Two value shapes are allowed, and no others:
 *   - a plain string, which may contain `{placeholders}`
 *   - `{ one, other }`, for counts — see `plural()` in ./index.ts
 *
 * Keep the nesting shallow and grouped by SCREEN, so a translator reads the
 * file in the order they would walk the app.
 */
export const en = {
  common: {
    cancel: 'Cancel',
    add: 'Add',
    done: 'Done',
    skip: 'Skip',
    back: 'Back',
    continue: 'Continue',
    delete: 'Delete',
    notNow: 'Not now',
    openSettings: 'Open Settings',
    tryAgain: 'Try again',
  },

  /**
   * Duration, in two registers.
   *
   * The LONG form is how a length is said out loud, and it is what goes in
   * sentences, captions and detail pills. The SHORT form exists because English
   * happens to have a one-letter abbreviation for both units and most languages
   * do not: Vietnamese spells "1 giờ 30 phút", which is correct prose and four
   * times the width of "1h 30m". Anywhere the text has to survive a 56pt chip
   * or a stat tile, the short form is the one that fits.
   */
  duration: {
    m: '{m}m',
    h: '{h}h',
    hm: '{h}h {m}m',
    shortM: '{m}m',
    shortH: '{h}h',
    shortHm: '{h}h {m}m',
  },

  /**
   * "January 15th, 2026".
   *
   * Three placeholders are supplied and a catalogue uses whichever it needs:
   * `{month}` is the month NAME from `Intl`, `{monthNum}` is its number, and
   * `{day}` is already spelled for the locale (an ordinal in English, a bare
   * number elsewhere). A language whose month name `Intl` capitalises wrongly
   * in context can therefore spell the word itself and take the number.
   */
  date: {
    long: '{month} {day}, {year}',
  },

  tabs: {
    todo: 'To-do',
    today: 'Today',
    focus: 'Focus',
    me: 'Me',
  },

  slot: {
    anytime: 'Anytime',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
  },

  error: {
    title: 'That screen did not load',
    body: 'Your plan is safe — it is stored on this device. You can try again.',
  },

  today: {
    a11yProgress: '{done} of {total} done',
    prevDay: 'Previous day',
    nextDay: 'Next day',
    jumpToToday: '{weekday}, {date}. Tap to jump to today.',
    dayOptions: 'Day options',
    addActivity: 'Add activity',
    compactLayout: 'Compact layout',
    timelineLayout: 'Timeline layout',
    emptyTitle: 'Nothing here yet',
    emptyBody: 'Add one thing you want to get done. One is enough to start a day.',
    anytimeHint: 'Anything that works today',
    slotCount: { one: '{label}, {count} activity', other: '{label}, {count} activities' },
    overdueCount: {
      one: '{count} unfinished from an earlier day',
      other: '{count} unfinished from earlier days',
    },
    moveToToday: 'Move to today',
  },

  todo: {
    title: 'To-do',
    addTodo: 'Add to-do',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    plain: 'To-do',
    hintHigh: 'Needs focus — add here',
    hintMedium: 'Not urgent — add here',
    hintLow: 'No rush — add here',
    hintPlain: 'Add it to your list',
  },

  row: {
    now: 'NOW',
    a11y: '{title}, {duration}',
    a11yCompleted: '{title}, {duration}, completed',
    markDone: 'Mark as done',
    markNotDone: 'Mark as not done',
    startFocusOn: 'Start focus on {title}',
    stepsDone: '{done} of {total} steps done',
  },

  focus: {
    title: 'Focus',
    /** The banner for a session that ends while the app is not in front. */
    alarmTitle: 'Time is up',
    alarmBody: 'Your focus session has finished.',
    pickLength: 'Pick how long you want to disappear for',
    range: '{from} → {to}',
    endsAtLong: 'Ends at {to}',
    endsAt: 'Ends at {time}',
    minutes: { one: 'MINUTE', other: 'MINUTES' },
    dialLabel: 'Focus length',
    start: 'Start',
    startA11y: 'Start {duration} focus',
    addMinute: '+ 1 min',
    addMinuteA11y: 'Add one minute',
    pause: 'Pause',
    resume: 'Resume',
    end: 'End',
    endSession: 'End session',
    endTitle: 'End this focus session?',
    endMessage: '{time} left.',
    keepGoing: 'Keep going',
    paused: 'PAUSED',
    steps: 'STEPS',
    allDone: 'All of it, done 🎉',
    timeUp: 'Time is up. That counted.',
    markItDone: 'Mark it done',
    notYet: 'Not yet',
  },

  me: {
    title: 'Me',
    hereTo: 'Here to {need}',
    doneToday: 'Done today',
    ofTotal: 'of {total}',
    planned: 'Planned',
    todaySub: 'today',
    activities: 'Activities',
    totalSub: 'total',
    planning: 'Planning',
    dayLayout: 'Day layout',
    compact: 'Compact',
    timeline: 'Timeline',
    routines: 'Routines',
    routinesNone: 'None set',
    /** "8 steps · 2 of 3" — how much is in the routines, and how many slots. */
    routineSummary: { one: '{count} step · {slots} of 3', other: '{count} steps · {slots} of 3' },
    reminders: 'Reminders',
    remindersOff: 'Off',
    remindersAsStart: 'As things start',
    remindersBefore: '{duration} before',
    about: 'About',
    appearance: 'Appearance',
    followsSystem: 'Follows system',
    yourData: 'Your data',
    onThisDevice: 'On this device',
    runOnboarding: 'Run onboarding again',
    version: 'Oneplan 1.0',
    notifOffTitle: 'Notifications are off',
    notifOffBody:
      'Allow notifications for Oneplan in Settings to get a nudge when an activity starts.',
    startOverTitle: 'Run onboarding again?',
    startOverBody: 'Your activities, appearance and reminder settings are kept.',
    startOver: 'Start over',
  },

  language: {
    title: 'Language',
    /** The row in Me. Its value is the resolved language's own name. */
    row: 'Language',
    system: 'System',
    systemSub: 'Match my phone',
    /** Shown under the list, explaining what "System" actually does. */
    footnote:
      'Oneplan opens in your phone’s language when it can. Pick a language here to override that.',
  },

  routines: {
    title: 'Routines',
    subtitle:
      'The parts of your day that repeat. Change what is in them, what order they happen in, and when they start.',
    none: 'No routines yet',
    nothingPicked: 'Nothing picked',
    nothingPickedLower: 'nothing picked',
    /** The collapsed row's one-line summary. */
    summary: { one: '{count} step · {duration} · {time}', other: '{count} steps · {duration} · {time}' },
    a11ySummary: { one: '{count} step, about {duration}, starts at {time}', other: '{count} steps, about {duration}, starts at {time}' },
    a11yRow: '{slot} routine, {summary}',
    startPrompt: 'When does your {slot} routine start?',
    addSomething: 'Add something',
    inThisRoutine: 'In this routine',
    orderFooter: 'Tap the arrows to change the order things happen in.',
    emptyList: 'Nothing here yet. Pick from the list below.',
    moveEarlier: 'Move {title} earlier',
    moveLater: 'Move {title} later',
    remove: 'Remove {title}',
    startsAt: 'Starts at',
    startTime: 'Start time',
    a11yStartTime: 'Start time, {time}',
    ownPlaceholder: 'Something of your own',
    addOwn: 'Add your own step',
    addStep: 'Add step',
    applyNote:
      'Changes apply to today straight away. Anything you have already ticked off stays ticked.',
    emptyHint:
      'Open a time of day below and pick the things you already do. One or two is plenty.',
  },

  appearance: {
    title: 'Appearance',
    subtitle:
      'Oneplan follows your device by default. Pick a side if you would rather it did not change on you.',
    theme: 'Theme',
    system: 'System',
    systemHint: 'Follows your device',
    light: 'Light',
    lightHint: 'Always light',
    dark: 'Dark',
    darkHint: 'Always dark',
  },

  reminderSettings: {
    title: 'Reminders',
    subtitle:
      'A nudge before an activity starts, so the plan does the remembering instead of you.',
    switchedOff: 'Reminders were switched off',
    notifications: 'Notifications',
    systemPermission: 'System permission',
    checking: 'Checking…',
    allowed: 'Allowed',
    notAllowed: 'Not allowed',
    activityReminders: 'Activity reminders',
    nothingWithTimes:
      'Nothing is scheduled yet — reminders attach to activities that have a start time, and none of yours do.',
    nothingToday:
      'Nothing is scheduled right now. Every activity with a start time today has already begun.',
    when: 'When',
    whenFooter: "Measured from the activity's own start time.",
    tenHint: 'Enough time to finish what you are doing',
    asItStarts: 'As it starts',
    before: '{duration} before',
    scheduledCount: {
      one: '{count} reminder is scheduled.',
      other: '{count} reminders are scheduled.',
    },
    preview: 'What you will see',
    previewA11y: 'Example notification. {title}. {body}',
    switchedOffBody:
      'Notifications for Oneplan were turned off in iOS Settings, so the app stopped promising nudges it could not deliver. Allow them again to turn this back on.',
    privacyNote:
      'Reminders are scheduled on this device. Nothing about your plan is sent anywhere.',
  },

  celebration: {
    morning: 'Morning done.\nThe rest can wait.',
    afternoon: 'Afternoon cleared.\nNice work.',
    evening: "Evening's done.\nYou can stop now.",
    badge: '{slot} DONE',
    a11y: '{slot} complete. Every activity in your {slotLower} is done.',
  },

  add: {
    newActivity: 'New activity',
    newTodo: 'New to-do',
    placeholderActivity: 'What are you doing?',
    placeholderTodo: 'What needs doing?',
    chooseIcon: 'Choose an icon',
    icon: 'Icon',
    iconA11y: 'Icon {emoji}',
    colour: 'Colour',
    colourA11y: 'Colour {name}',
    quickPick: 'Quick pick',
    howLong: 'How long',
    when: 'When',
    startsAt: 'Starts at',
    noSetTime: 'No set time',
    tag: 'Tag',
    steps: 'Steps',
    stepPlaceholder: 'Break it into steps',
    removeStep: 'Remove step {title}',
    addActivity: 'Add activity',
    discardTitle: 'Discard activity?',
    discardBody: 'It has not been added yet.',
    discardAction: 'Discard activity',
    /** The bare verb, for the Android alert whose title already names the thing. */
    discard: 'Discard',
    keepEditing: 'Keep editing',
  },

  task: {
    goneTitle: 'This activity is gone',
    goneBody: 'It was deleted, or the link is out of date.',
    backToToday: 'Back to today',
    deleteActivity: 'Delete activity',
    steps: 'STEPS',
    noStepsTitle: 'No steps yet',
    noStepsBody: 'Breaking this into two or three steps usually makes starting easier.',
    addStep: 'Add a step',
    remove: 'Remove {title}',
    markDone: 'Mark as done',
    markNotDone: 'Mark as not done',
    focus: 'Focus',

    /** Editing. Every one of these is a field the activity always had and
     *  could never be changed after it was created. */
    edit: 'Edit',
    editA11y: '{field}: {value}. Tap to change.',
    renameTitle: 'Rename activity',
    renamePlaceholder: 'What are you doing?',
    duration: 'How long',
    whenSlot: 'Time of day',
    startsAt: 'Starts at',
    noSetTime: 'No set time',
    tagField: 'Tag',
    noTag: 'No tag',
    moveTitle: 'Move to',
    moveToday: 'Today',
    moveTomorrow: 'Tomorrow',
    moveInbox: 'To-do list',
    dateField: 'Day',
    inboxValue: 'To-do list',
    priority: 'Priority',
    /** A routine's fields are regenerated daily, so they are edited at source. */
    editInRoutines: 'Edit in Routines',
  },

  onboarding: {
    stepOf: 'Step {step} of {total}',
    welcomeBody:
      'One day at a time, laid out so you can see it. Built for brains that do better with pictures than lists.',
    getStarted: 'Get started',
    noAccount: 'No account needed. Everything stays on your phone.',

    needTitle: 'What do you need\nmost right now?',
    needSubtitle:
      'So we can put the right thing on your first screen. You can change this later.',
    needOrganise: 'Organise my day and time',
    needRemember: 'Remember my tasks',
    needPrioritise: 'Prioritise my to-dos',
    needRoutines: 'Build and stick to routines',
    needFocus: 'Support focus work',

    rhythmTitle: 'How do you like\nto plan a day?',
    rhythmSubtitle:
      'Some days need a timetable, some just need an order. Pick what usually works.',
    rhythmLoose: 'Loose — morning, afternoon, evening',
    rhythmTimed: 'Timed — everything on the clock',
    rhythmBoth: 'A bit of both',

    routinesMorningTitle: 'How does a\ngood morning go?',
    routinesMorningSubtitle:
      'Pick the things you already do. We will keep them in this order so you do not have to.',
    routinesAfternoonTitle: 'What keeps the\nafternoon moving?',
    routinesAfternoonSubtitle:
      'The middle of the day is where plans quietly fall apart. A couple of anchors is plenty.',
    routinesEveningTitle: 'How does the\nday wind down?',
    routinesEveningSubtitle:
      'Evenings run on autopilot until they do not. Pick what you want the plan to remember.',
    routinesCta: 'Continue with my routines',
    routinesEmpty: 'Pick as many or as few as you like — you can skip this.',
    routinesPicked: '{count} picked · about {duration}',

    remindersTitle: 'A nudge just\nbefore you start',
    remindersSubtitle:
      'Oneplan can tell you a few minutes ahead of an activity, so the plan does the remembering instead of you.',
    remindersCta: 'Turn on reminders',
    remindersSkip: 'Not right now',
    remindersBrand: 'ONEPLAN',
    remindersPreview1Title: 'Morning routine',
    remindersPreview1Title2: 'Lunch',
    remindersPreview2Title: 'Lunch',
    remindersPreview2Body: 'Coming up at 12:30',

    readyTitle: 'Your day is\nready to look at',
    readySubtitle:
      'We have put a starter day in for you. Change anything, delete anything — it is yours.',
    readyCta: 'Start planning',
    readyBubble: "Right then. Let's have a look at it.",
  },

  notification: {
    /** Two sentences, not a dash — with a lead time there are two durations. */
    startingNow: 'Starting now. Takes {duration}.',
    startsIn: 'Starts in {lead}. Takes {duration}.',
    channel: 'Activity reminders',
  },

  tag: {
    work: 'Work',
    study: 'Study',
    health: 'Health',
    selfCare: 'Self care',
    household: 'Household',
    humanNeeds: 'Human needs',
    exercise: 'Exercise',
    social: 'Social',
    admin: 'Admin',
    hobby: 'Hobby',
  },

  suggestion: {
    walk: 'Take a walk',
    email: 'Answer emails',
    stretch: 'Stretch',
    desk: 'Tidy desk',
    call: 'Call someone',
    water: 'Drink water',
  },

  /** The onboarding routine catalogue. Keys are the stable option ids. */
  routine: {
    wake: 'Wake up',
    'water-am': 'Drink water',
    bed: 'Make bed',
    'teeth-am': 'Brush teeth',
    shower: 'Shower',
    dressed: 'Get dressed',
    'meds-am': 'Take meds',
    breakfast: 'Breakfast',
    coffee: 'Have coffee',
    plan: 'Plan your day',
    'stretch-am': 'Stretch',
    commute: 'Commute',

    lunch: 'Lunch',
    walk: 'Walk outside',
    'water-pm': 'Drink water',
    'deep-work': 'Deep work',
    email: 'Check email',
    snack: 'Snack',
    desk: 'Tidy desk',
    move: 'Move your body',
    errands: 'Errands',
    breathe: 'Take a breather',
    call: 'Call someone',
    review: 'Review the day',

    dinner: 'Dinner',
    tidy: 'Tidy up',
    dishes: 'Do the dishes',
    'teeth-pm': 'Brush teeth',
    skincare: 'Skincare',
    'meds-pm': 'Take meds',
    read: 'Read a chapter',
    journal: 'Journal',
    clothes: 'Lay out clothes',
    screens: 'Screens off',
    alarm: 'Set an alarm',
    'wind-down': 'Wind down',
  },

  /** Titles of the parent activity each routine set rolls up into. */
  routineParent: {
    morning: 'Morning routine',
    afternoon: 'Afternoon reset',
    evening: 'Evening routine',
  },

  /** The starter day written on first launch. */
  seed: {
    plan: 'Plan your day',
    morning: 'Morning routine',
    tidy: 'Quick tidy',
    work: 'Start work',
    water: 'Drink water',
    lunch: 'Lunch',
    dinner: 'Have dinner',
    evening: 'Evening routine',
    dentist: 'Book dentist',
    laundry: 'Do laundry',
    stepWake: 'Wake up',
    stepTeeth: 'Brush teeth',
    stepBreakfast: 'Breakfast',
    stepCoffee: 'Have coffee',
    stepTidy: 'Tidy up',
    stepRead: 'Read a chapter',
  },
} as const;

/**
 * The shape every other language must match, exactly.
 *
 * `Mutable` strips the `as const` readonly-ness and widens each literal back to
 * `string`, so a translation is checked for the same KEYS without also being
 * required to repeat the English WORDS.
 */
type Mutable<T> = T extends { one: string; other: string }
  ? { one: string; other: string }
  : T extends string
    ? string
    : { -readonly [K in keyof T]: Mutable<T[K]> };

export type Dict = Mutable<typeof en>;
