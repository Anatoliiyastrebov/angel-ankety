import { Language } from './translations';

export type QuestionType = 'text' | 'number' | 'radio' | 'checkbox' | 'textarea';

export interface QuestionOption {
  value: string;
  label: {
    ru: string;
    en: string;
    de: string;
  };
}

export interface QuestionCondition {
  questionId: string;
  value: string | string[];
  operator?: 'equals' | 'notEquals' | 'includes' | 'notIncludes';
}

export interface Question {
  id: string;
  type: QuestionType;
  number?: number; // Номер вопроса для отображения
  label: {
    ru: string;
    en: string;
    de: string;
  };
  icon: string;
  options?: QuestionOption[];
  required: boolean;
  hasAdditional: boolean;
  showIf?: QuestionCondition; // Условие показа вопроса
  placeholder?: {
    ru: string;
    en: string;
    de: string;
  };
  min?: number;
  max?: number;
}

// Функция для проверки условия показа вопроса
export function shouldShowQuestion(
  question: Question,
  formData: { [key: string]: string | string[] }
): boolean {
  if (!question.showIf) return true;

  const { questionId, value, operator = 'equals' } = question.showIf;
  const currentValue = formData[questionId];

  if (currentValue === undefined || currentValue === null) return false;

  const currentArray = Array.isArray(currentValue) ? currentValue : [currentValue];
  const targetArray = Array.isArray(value) ? value : [value];

  switch (operator) {
    case 'equals':
      return targetArray.some(v => currentArray.includes(v));
    case 'notEquals':
      return !targetArray.some(v => currentArray.includes(v));
    case 'includes':
      return targetArray.every(v => currentArray.includes(v));
    case 'notIncludes':
      return !targetArray.some(v => currentArray.includes(v));
    default:
      return true;
  }
}

// Функция для получения читаемого значения ответа
export function getAnswerLabel(
  question: Question,
  value: string | string[],
  lang: 'ru' | 'en' | 'de'
): string {
  if (!value) return '';

  if (Array.isArray(value)) {
    if (!question.options) return value.join(', ');
    return value
      .map(v => {
        const option = question.options?.find(o => o.value === v);
        return option ? option.label[lang] : v;
      })
      .join(', ');
  }

  if (question.options) {
    const option = question.options.find(o => o.value === value);
    return option ? option.label[lang] : value;
  }

  return value;
}

// Функция для форматирования всех ответов анкеты в читаемый текст
export function formatQuestionnaireAnswers(
  sections: QuestionnaireSection[],
  formData: { [key: string]: string | string[] },
  additionalData: { [key: string]: string },
  lang: 'ru' | 'en' | 'de'
): string {
  const lines: string[] = [];
  const headers = {
    ru: '📝 Ответы на вопросы анкеты:',
    en: '📝 Questionnaire Answers:',
    de: '📝 Fragebogen-Antworten:'
  };
  
  lines.push(headers[lang]);
  lines.push('');

  sections.forEach(section => {
    const sectionQuestions = section.questions.filter(q => {
      // Пропускаем вопросы с условиями, если условие не выполнено
      if (q.showIf && !shouldShowQuestion(q, formData)) return false;
      // Пропускаем вопросы без ответа
      const value = formData[q.id];
      return value && (Array.isArray(value) ? value.length > 0 : value.toString().trim() !== '');
    });

    if (sectionQuestions.length === 0) return;

    lines.push(`📋 ${section.title[lang]}:`);
    
    sectionQuestions.forEach(question => {
      const value = formData[question.id];
      const label = getAnswerLabel(question, value, lang);
      const additional = additionalData[`${question.id}_additional`];
      
      // Формируем текст вопроса (без номера, т.к. он уже в label)
      let questionText = question.label[lang];
      // Убираем номер из начала, если хотим показать только название
      // questionText = questionText.replace(/^\d+\.?\d*\.?\s*/, '');
      
      let answerLine = `• ${questionText}: ${label}`;
      
      // Добавляем дополнительную информацию
      if (additional && additional.trim()) {
        if (question.id === 'weight_goal') {
          answerLine += ` (${additional} кг)`;
        } else if (question.id === 'regular_medications') {
          answerLine += ` (${additional})`;
        } else {
          answerLine += ` — ${additional}`;
        }
      }
      
      lines.push(answerLine);
    });
    
    lines.push('');
  });

  return lines.join('\n');
}

export interface QuestionnaireSection {
  id: string;
  title: {
    ru: string;
    en: string;
    de: string;
  };
  icon: string;
  questions: Question[];
}

// Common options used across questionnaires
const yesNoOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'yes', label: { ru: 'Да', en: 'Yes', de: 'Ja' } },
  { value: 'no', label: { ru: 'Нет', en: 'No', de: 'Nein' } },
];

const yesNoOptionsSimple: QuestionOption[] = [
  { value: 'yes', label: { ru: 'Да', en: 'Yes', de: 'Ja' } },
  { value: 'no', label: { ru: 'Нет', en: 'No', de: 'Nein' } },
];

const digestionOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'stomach_pain', label: { ru: 'Боли в животе', en: 'Stomach pain', de: 'Bauchschmerzen' } },
  { value: 'diarrhea', label: { ru: 'Диарея', en: 'Diarrhea', de: 'Durchfall' } },
  { value: 'constipation', label: { ru: 'Запор', en: 'Constipation', de: 'Verstopfung' } },
];

const digestionOptionsExtended: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'stomach_pain', label: { ru: 'Боли в животе', en: 'Stomach pain', de: 'Bauchschmerzen' } },
  { value: 'diarrhea', label: { ru: 'Диарея', en: 'Diarrhea', de: 'Durchfall' } },
  { value: 'constipation', label: { ru: 'Запор', en: 'Constipation', de: 'Verstopfung' } },
  { value: 'bloating', label: { ru: 'Вздутие', en: 'Bloating', de: 'Blähungen' } },
];

const digestionOptionsAdult: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'heartburn', label: { ru: 'Изжога', en: 'Heartburn', de: 'Sodbrennen' } },
  { value: 'bloating', label: { ru: 'Вздутие', en: 'Bloating', de: 'Blähungen' } },
  { value: 'diarrhea', label: { ru: 'Диарея', en: 'Diarrhea', de: 'Durchfall' } },
  { value: 'constipation', label: { ru: 'Запор', en: 'Constipation', de: 'Verstopfung' } },
];

const allergyOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'pollen', label: { ru: 'Цветение', en: 'Pollen', de: 'Pollen' } },
  { value: 'animals', label: { ru: 'Животные', en: 'Animals', de: 'Tiere' } },
  { value: 'dust', label: { ru: 'Пыль', en: 'Dust', de: 'Staub' } },
  { value: 'food', label: { ru: 'Еда', en: 'Food', de: 'Lebensmittel' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

const allergyOptionsExtended: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'pollen', label: { ru: 'Цветение', en: 'Pollen', de: 'Pollen' } },
  { value: 'animals', label: { ru: 'Животные', en: 'Animals', de: 'Tiere' } },
  { value: 'dust', label: { ru: 'Пыль', en: 'Dust', de: 'Staub' } },
  { value: 'food', label: { ru: 'Еда', en: 'Food', de: 'Lebensmittel' } },
  { value: 'medications', label: { ru: 'Лекарства', en: 'Medications', de: 'Medikamente' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

const skinOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'moles', label: { ru: 'Много родинок', en: 'Many moles', de: 'Viele Muttermale' } },
  { value: 'warts', label: { ru: 'Бородавки', en: 'Warts', de: 'Warzen' } },
  { value: 'rashes', label: { ru: 'Высыпания', en: 'Rashes', de: 'Ausschläge' } },
  { value: 'eczema', label: { ru: 'Экзема', en: 'Eczema', de: 'Ekzeme' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

const sleepOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'good', label: { ru: 'Хорошо', en: 'Good', de: 'Gut' } },
  { value: 'bad', label: { ru: 'Плохо', en: 'Bad', de: 'Schlecht' } },
  { value: 'sometimes', label: { ru: 'Иногда проблемы', en: 'Sometimes problems', de: 'Manchmal Probleme' } },
];

const sleepOptionsSimple: QuestionOption[] = [
  { value: 'good', label: { ru: 'Хорошо', en: 'Good', de: 'Gut' } },
  { value: 'bad', label: { ru: 'Плохо', en: 'Bad', de: 'Schlecht' } },
  { value: 'sometimes', label: { ru: 'Иногда проблемы', en: 'Sometimes problems', de: 'Manchmal Probleme' } },
];

const energyOptions: QuestionOption[] = [
  { value: 'normal', label: { ru: 'Нормальная', en: 'Normal', de: 'Normal' } },
  { value: 'reduced', label: { ru: 'Сниженная', en: 'Reduced', de: 'Reduziert' } },
  { value: 'very_low', label: { ru: 'Очень низкая', en: 'Very low', de: 'Sehr niedrig' } },
];

const birthOptions: QuestionOption[] = [
  { value: 'natural', label: { ru: 'Естественно', en: 'Natural', de: 'Natürlich' } },
  { value: 'cesarean', label: { ru: 'Кесарево', en: 'Cesarean', de: 'Kaiserschnitt' } },
];

const injuriesOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Все в порядке', en: 'All is well', de: 'Alles in Ordnung' } },
  { value: 'injuries', label: { ru: 'Травмы', en: 'Injuries', de: 'Verletzungen' } },
  { value: 'surgeries', label: { ru: 'Операции', en: 'Surgeries', de: 'Operationen' } },
  { value: 'head_trauma', label: { ru: 'Удары по голове', en: 'Head trauma', de: 'Kopftrauma' } },
  { value: 'fractures', label: { ru: 'Переломы', en: 'Fractures', de: 'Brüche' } },
  { value: 'severe_falls', label: { ru: 'Сильные падения', en: 'Severe falls', de: 'Schwere Stürze' } },
];

const operationsTraumasOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет операций и травм', en: 'No operations or injuries', de: 'Keine Operationen oder Verletzungen' } },
  { value: 'surgeries', label: { ru: 'Операции', en: 'Surgeries', de: 'Operationen' } },
  { value: 'organ_removed', label: { ru: 'Удалены органы', en: 'Organs removed', de: 'Organe entfernt' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

const covidOptionsWoman: QuestionOption[] = [
  { value: 'no', label: { ru: 'Нет', en: 'No', de: 'Nein' } },
  { value: 'had_covid', label: { ru: 'Болела', en: 'Had COVID', de: 'Hatte COVID' } },
  { value: 'vaccinated', label: { ru: 'Вакцинирована', en: 'Vaccinated', de: 'Geimpft' } },
  { value: 'both', label: { ru: 'И болела, и вакцинирована', en: 'Both had COVID and vaccinated', de: 'Sowohl COVID gehabt als auch geimpft' } },
];

const covidOptionsMan: QuestionOption[] = [
  { value: 'no', label: { ru: 'Нет', en: 'No', de: 'Nein' } },
  { value: 'had_covid', label: { ru: 'Болел', en: 'Had COVID', de: 'Hatte COVID' } },
  { value: 'vaccinated', label: { ru: 'Вакцинирован', en: 'Vaccinated', de: 'Geimpft' } },
  { value: 'both', label: { ru: 'И болел, и вакцинирован', en: 'Both had COVID and vaccinated', de: 'Sowohl COVID gehabt als auch geimpft' } },
];

const teethOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'crumble', label: { ru: 'Крошатся', en: 'Crumble', de: 'Bröckeln' } },
  { value: 'decay_fast', label: { ru: 'Часто портятся', en: 'Decay often', de: 'Verderben oft' } },
  { value: 'bad_breath', label: { ru: 'Запах изо рта', en: 'Bad breath', de: 'Mundgeruch' } },
  { value: 'bleeding_gums', label: { ru: 'Кровоточивость', en: 'Bleeding gums', de: 'Zahnfleischbluten' } },
];

const jointOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'crunch', label: { ru: 'Хруст', en: 'Crunching', de: 'Knacken' } },
  { value: 'squeak', label: { ru: 'Скрип', en: 'Squeaking', de: 'Quietschen' } },
  { value: 'inflammation', label: { ru: 'Воспаление', en: 'Inflammation', de: 'Entzündung' } },
];

const hairOptions: QuestionOption[] = [
  { value: 'falling', label: { ru: 'Выпадают', en: 'Falling out', de: 'Fallen aus' } },
  { value: 'split', label: { ru: 'Секутся', en: 'Split ends', de: 'Spliss' } },
  { value: 'dry', label: { ru: 'Сухие', en: 'Dry', de: 'Trocken' } },
  { value: 'ok', label: { ru: 'В порядке', en: 'Normal', de: 'Normal' } },
];

const skinConditionOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'dry', label: { ru: 'Сухая', en: 'Dry', de: 'Trocken' } },
  { value: 'rashes', label: { ru: 'Высыпания', en: 'Rashes', de: 'Ausschläge' } },
  { value: 'irritation', label: { ru: 'Раздражение', en: 'Irritation', de: 'Reizung' } },
  { value: 'acne', label: { ru: 'Прыщи', en: 'Acne', de: 'Akne' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

const molesWartsHerpesOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'moles', label: { ru: 'Родинки', en: 'Moles', de: 'Muttermale' } },
  { value: 'warts', label: { ru: 'Бородавки', en: 'Warts', de: 'Warzen' } },
  { value: 'herpes', label: { ru: 'Герпес', en: 'Herpes', de: 'Herpes' } },
];

const dischargeMolesWartsHerpesOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'thrush', label: { ru: 'Молочница', en: 'Thrush', de: 'Soor' } },
  { value: 'moles', label: { ru: 'Много родинок', en: 'Many moles', de: 'Viele Muttermale' } },
  { value: 'warts', label: { ru: 'Бородавки', en: 'Warts', de: 'Warzen' } },
  { value: 'hpv_skin', label: { ru: 'Папилломавирус на коже', en: 'HPV on skin', de: 'HPV auf der Haut' } },
  { value: 'herpes', label: { ru: 'Герпес', en: 'Herpes', de: 'Herpes' } },
];

const memoryOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'poor_memory', label: { ru: 'Плохая память', en: 'Poor memory', de: 'Schlechtes Gedächtnis' } },
  { value: 'poor_concentration', label: { ru: 'Плохая концентрация', en: 'Poor concentration', de: 'Schlechte Konzentration' } },
  { value: 'both', label: { ru: 'И память, и концентрация', en: 'Both memory and concentration', de: 'Sowohl Gedächtnis als auch Konzentration' } },
];

const illnessAntibioticsOptions: QuestionOption[] = [
  { value: 'rarely_ill', label: { ru: 'Редко болеет', en: 'Rarely ill', de: 'Selten krank' } },
  { value: 'often_ill', label: { ru: 'Часто болеет', en: 'Often ill', de: 'Oft krank' } },
  { value: 'took_antibiotics', label: { ru: 'Принимал антибиотики', en: 'Took antibiotics', de: 'Antibiotika genommen' } },
  { value: 'took_medications', label: { ru: 'Принимал лекарства', en: 'Took medications', de: 'Medikamente genommen' } },
  { value: 'both', label: { ru: 'И часто болеет, и принимал антибиотики', en: 'Both often ill and took antibiotics', de: 'Sowohl oft krank als auch Antibiotika genommen' } },
];

const cystsStonesOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'cysts', label: { ru: 'Кисты', en: 'Cysts', de: 'Zysten' } },
  { value: 'fibroids', label: { ru: 'Миомы', en: 'Fibroids', de: 'Myome' } },
  { value: 'stones_kidneys', label: { ru: 'Камни в почках', en: 'Stones in kidneys', de: 'Steine in Nieren' } },
  { value: 'sand_kidneys', label: { ru: 'Песок в почках', en: 'Sand in kidneys', de: 'Sand in Nieren' } },
  { value: 'stones_gallbladder', label: { ru: 'Камни в желчном', en: 'Stones in gallbladder', de: 'Steine in Gallenblase' } },
];

const cystsStonesKidneysOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'cysts', label: { ru: 'Кисты', en: 'Cysts', de: 'Zysten' } },
  { value: 'sand', label: { ru: 'Песок', en: 'Sand', de: 'Sand' } },
  { value: 'stones_kidneys', label: { ru: 'Камни в почках', en: 'Stones in kidneys', de: 'Steine in Nieren' } },
  { value: 'stones_gallbladder', label: { ru: 'Камни в желчном', en: 'Stones in gallbladder', de: 'Steine in Gallenblase' } },
];

const menstruationOptions: QuestionOption[] = [
  { value: 'regular', label: { ru: 'Регулярные', en: 'Regular', de: 'Regelmäßig' } },
  { value: 'heavy', label: { ru: 'Обильные', en: 'Heavy', de: 'Stark' } },
  { value: 'clots', label: { ru: 'Сгустками', en: 'With clots', de: 'Mit Gerinnseln' } },
  { value: 'painful', label: { ru: 'Болезненные', en: 'Painful', de: 'Schmerzhaft' } },
  { value: 'hot_flashes', label: { ru: 'Приливы', en: 'Hot flashes', de: 'Hitzewallungen' } },
  { value: 'sweating', label: { ru: 'Потливость', en: 'Sweating', de: 'Schwitzen' } },
  { value: 'poor_sleep', label: { ru: 'Плохой сон', en: 'Poor sleep', de: 'Schlechter Schlaf' } },
  { value: 'mood_swings', label: { ru: 'Скачки настроения', en: 'Mood swings', de: 'Stimmungsschwankungen' } },
];

const headachesOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'headaches', label: { ru: 'Головные боли', en: 'Headaches', de: 'Kopfschmerzen' } },
  { value: 'migraines', label: { ru: 'Мигрени', en: 'Migraines', de: 'Migräne' } },
  { value: 'injuries', label: { ru: 'Травмы', en: 'Injuries', de: 'Verletzungen' } },
  { value: 'concussion', label: { ru: 'Сотрясение', en: 'Concussion', de: 'Gehirnerschütterung' } },
];

const headachesSleepOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'headaches', label: { ru: 'Головные боли', en: 'Headaches', de: 'Kopfschmerzen' } },
  { value: 'poor_sleep', label: { ru: 'Плохой сон', en: 'Poor sleep', de: 'Schlechter Schlaf' } },
  { value: 'both', label: { ru: 'И головные боли, и плохой сон', en: 'Both headaches and poor sleep', de: 'Sowohl Kopfschmerzen als auch schlechter Schlaf' } },
];

const hyperactiveOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'hyperactive', label: { ru: 'Гиперактивный', en: 'Hyperactive', de: 'Hyperaktiv' } },
  { value: 'tired_often', label: { ru: 'Часто устаёт', en: 'Often tired', de: 'Oft müde' } },
  { value: 'normal', label: { ru: 'Нормально', en: 'Normal', de: 'Normal' } },
];

const sugarOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'no', label: { ru: 'Нет', en: 'No', de: 'Nein' } },
  { value: 'moderate', label: { ru: 'Умеренно', en: 'Moderate', de: 'Mäßig' } },
  { value: 'strong', label: { ru: 'Сильно', en: 'Strong', de: 'Stark' } },
];

const pressureOptions: QuestionOption[] = [
  { value: 'low', label: { ru: 'Низкое', en: 'Low', de: 'Niedrig' } },
  { value: 'high', label: { ru: 'Высокое', en: 'High', de: 'Hoch' } },
  { value: 'normal', label: { ru: 'Нормальное', en: 'Normal', de: 'Normal' } },
];

const waterOptions: QuestionOption[] = [
  { value: '1', label: { ru: '1 литр', en: '1 liter', de: '1 Liter' } },
  { value: '1.5', label: { ru: '1.5 литра', en: '1.5 liters', de: '1.5 Liter' } },
  { value: '2', label: { ru: '2 литра', en: '2 liters', de: '2 Liter' } },
  { value: '2.5', label: { ru: '2.5 литра', en: '2.5 liters', de: '2.5 Liter' } },
  { value: '3', label: { ru: '3 литра', en: '3 liters', de: '3 Liter' } },
  { value: '3.5', label: { ru: '3.5 литра', en: '3.5 liters', de: '3.5 Liter' } },
];

const sleepAdultOptions: QuestionOption[] = [
  { value: 'good', label: { ru: 'Хороший', en: 'Good', de: 'Gut' } },
  { value: 'hard_to_fall_asleep', label: { ru: 'Трудно заснуть', en: 'Hard to fall asleep', de: 'Schwer einzuschlafen' } },
  { value: 'wake_often', label: { ru: 'Часто просыпаюсь', en: 'Wake up often', de: 'Wache oft auf' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

// New options for updated medical questions
const weightSatisfactionOptions: QuestionOption[] = [
  { value: 'satisfied', label: { ru: 'Довольна весом', en: 'Satisfied with weight', de: 'Mit Gewicht zufrieden' } },
  { value: 'want_to_lose', label: { ru: 'Хочу сбросить', en: 'Want to lose', de: 'Möchte abnehmen' } },
  { value: 'want_to_gain', label: { ru: 'Хочу набрать', en: 'Want to gain', de: 'Möchte zunehmen' } },
];

const weightSatisfactionOptionsMan: QuestionOption[] = [
  { value: 'satisfied', label: { ru: 'Доволен весом', en: 'Satisfied with weight', de: 'Mit Gewicht zufrieden' } },
  { value: 'want_to_lose', label: { ru: 'Хочу сбросить', en: 'Want to lose', de: 'Möchte abnehmen' } },
  { value: 'want_to_gain', label: { ru: 'Хочу набрать', en: 'Want to gain', de: 'Möchte zunehmen' } },
];

const covidComplicationsOptions: QuestionOption[] = [
  { value: 'hair_loss', label: { ru: 'Выпадение волос', en: 'Hair loss', de: 'Haarausfall' } },
  { value: 'heart_problems', label: { ru: 'Проблемы сердца', en: 'Heart problems', de: 'Herzprobleme' } },
  { value: 'joints', label: { ru: 'Суставы', en: 'Joints', de: 'Gelenke' } },
  { value: 'memory_loss', label: { ru: 'Потеря памяти', en: 'Memory loss', de: 'Gedächtnisverlust' } },
  { value: 'panic_attacks', label: { ru: 'Панические атаки', en: 'Panic attacks', de: 'Panikattacken' } },
  { value: 'poor_sleep', label: { ru: 'Ухудшение сна', en: 'Poor sleep', de: 'Schlechter Schlaf' } },
  { value: 'no_complications', label: { ru: 'Нет осложнений', en: 'No complications', de: 'Keine Komplikationen' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

const hairQualityOptions: QuestionOption[] = [
  { value: 'healthy', label: { ru: 'Здоровые', en: 'Healthy', de: 'Gesund' } },
  { value: 'dry', label: { ru: 'Сухие', en: 'Dry', de: 'Trocken' } },
  { value: 'oily', label: { ru: 'Жирные', en: 'Oily', de: 'Fettig' } },
  { value: 'brittle', label: { ru: 'Ломкие', en: 'Brittle', de: 'Brüchig' } },
  { value: 'falling_out', label: { ru: 'Выпадают', en: 'Falling out', de: 'Ausfallend' } },
  { value: 'thin', label: { ru: 'Тонкие', en: 'Thin', de: 'Dünn' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

const hairQualityOptionsMan: QuestionOption[] = [
  { value: 'healthy', label: { ru: 'Здоровые', en: 'Healthy', de: 'Gesund' } },
  { value: 'dry', label: { ru: 'Сухие', en: 'Dry', de: 'Trocken' } },
  { value: 'oily', label: { ru: 'Жирные', en: 'Oily', de: 'Fettig' } },
  { value: 'brittle', label: { ru: 'Ломкие', en: 'Brittle', de: 'Brüchig' } },
  { value: 'falling_out', label: { ru: 'Выпадают', en: 'Falling out', de: 'Ausfallend' } },
  { value: 'thin', label: { ru: 'Тонкие', en: 'Thin', de: 'Dünn' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

const teethProblemsOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'crumble_fast', label: { ru: 'Быстро крошатся', en: 'Crumble fast', de: 'Bröckeln schnell' } },
  { value: 'decay_fast', label: { ru: 'Быстро портятся', en: 'Decay fast', de: 'Verderben schnell' } },
  { value: 'bad_breath', label: { ru: 'Неприятный запах изо рта', en: 'Bad breath', de: 'Mundgeruch' } },
  { value: 'bleeding_gums', label: { ru: 'Кровоточат десна', en: 'Bleeding gums', de: 'Zahnfleischbluten' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

const digestionDetailedOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'heartburn', label: { ru: 'Изжога', en: 'Heartburn', de: 'Sodbrennen' } },
  { value: 'bitterness', label: { ru: 'Горечь во рту', en: 'Bitterness in mouth', de: 'Bitterkeit im Mund' } },
  { value: 'bloating', label: { ru: 'Вздутие', en: 'Bloating', de: 'Blähungen' } },
  { value: 'heaviness', label: { ru: 'Тяжесть в желудке', en: 'Heaviness in stomach', de: 'Schwere im Magen' } },
  { value: 'gas', label: { ru: 'Газы', en: 'Gas', de: 'Blähungen' } },
  { value: 'diarrhea', label: { ru: 'Диарея', en: 'Diarrhea', de: 'Durchfall' } },
  { value: 'constipation', label: { ru: 'Запор', en: 'Constipation', de: 'Verstopfung' } },
  { value: 'pancreatitis', label: { ru: 'Панкреатит', en: 'Pancreatitis', de: 'Pankreatitis' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

const stonesSizeOptions: QuestionOption[] = [
  { value: 'no_stones', label: { ru: 'Нет камней', en: 'No stones', de: 'Keine Steine' } },
  { value: 'small', label: { ru: 'Мелкие (до 5мм)', en: 'Small (up to 5mm)', de: 'Klein (bis 5mm)' } },
  { value: 'medium', label: { ru: 'Средние (5-10мм)', en: 'Medium (5-10mm)', de: 'Mittel (5-10mm)' } },
  { value: 'large', label: { ru: 'Крупные (более 10мм)', en: 'Large (over 10mm)', de: 'Groß (über 10mm)' } },
];

const pressureMedicationOptions: QuestionOption[] = [
  { value: 'no_medication', label: { ru: 'Не пью', en: 'Not taking', de: 'Nehme nicht' } },
  { value: 'taking_short', label: { ru: 'Пью недолго (до месяца)', en: 'Taking short term (up to month)', de: 'Nehme kurzfristig (bis Monat)' } },
  { value: 'taking_long', label: { ru: 'Пью долго (более месяца)', en: 'Taking long term (over month)', de: 'Nehme langfristig (über Monat)' } },
];

const chronicDiseasesOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет', en: 'No', de: 'Nein' } },
  { value: 'diabetes', label: { ru: 'Диабет', en: 'Diabetes', de: 'Diabetes' } },
  { value: 'autoimmune_thyroiditis', label: { ru: 'Аутоиммунный тиреоидит', en: 'Autoimmune thyroiditis', de: 'Autoimmunthyreoiditis' } },
  { value: 'arthritis', label: { ru: 'Артрит', en: 'Arthritis', de: 'Arthritis' } },
  { value: 'psoriasis', label: { ru: 'Псориаз', en: 'Psoriasis', de: 'Psoriasis' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

const headachesDetailedOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'headaches', label: { ru: 'Головные боли', en: 'Headaches', de: 'Kopfschmerzen' } },
  { value: 'migraines', label: { ru: 'Мигрени', en: 'Migraines', de: 'Migräne' } },
  { value: 'weather_dependent', label: { ru: 'Метеозависимость', en: 'Weather dependent', de: 'Wetterabhängig' } },
  { value: 'concussion', label: { ru: 'Сотрясение мозга', en: 'Concussion', de: 'Gehirnerschütterung' } },
  { value: 'head_trauma', label: { ru: 'Удары по голове', en: 'Head trauma', de: 'Kopftrauma' } },
  { value: 'tinnitus', label: { ru: 'Шум в ушах', en: 'Tinnitus', de: 'Tinnitus' } },
  { value: 'floaters', label: { ru: 'Мушки перед глазами', en: 'Floaters', de: 'Mouches volantes' } },
  { value: 'dizziness', label: { ru: 'Головокружения', en: 'Dizziness', de: 'Schwindel' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

const numbnessOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'numbness_fingers', label: { ru: 'Онемение пальцев рук и ног', en: 'Numbness in fingers and toes', de: 'Taubheit in Fingern und Zehen' } },
  { value: 'cold_limbs', label: { ru: 'Руки и ноги холодные даже летом', en: 'Cold hands and feet even in summer', de: 'Kalte Hände und Füße auch im Sommer' } },
  { value: 'both', label: { ru: 'Оба симптома', en: 'Both symptoms', de: 'Beide Symptome' } },
];

const varicoseHemorrhoidsDetailedOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'varicose_network', label: { ru: 'Варикоз (сеточка)', en: 'Varicose veins (network)', de: 'Krampfadern (Netz)' } },
  { value: 'varicose_pronounced', label: { ru: 'Варикоз (выраженные вены)', en: 'Varicose veins (pronounced)', de: 'Krampfadern (ausgeprägt)' } },
  { value: 'hemorrhoids_bleeding', label: { ru: 'Геморрой (кровоточит)', en: 'Hemorrhoids (bleeding)', de: 'Hämorrhoiden (blutend)' } },
  { value: 'hemorrhoids_no_bleeding', label: { ru: 'Геморрой (не кровоточит)', en: 'Hemorrhoids (not bleeding)', de: 'Hämorrhoiden (nicht blutend)' } },
  { value: 'pigment_spots', label: { ru: 'Пигментные пятна', en: 'Pigment spots', de: 'Pigmentflecken' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

const jointsDetailedOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'squeak', label: { ru: 'Скрипят', en: 'Squeak', de: 'Quietschen' } },
  { value: 'crunch', label: { ru: 'Хрустят', en: 'Crunch', de: 'Knacken' } },
  { value: 'inflammation', label: { ru: 'Воспаляются', en: 'Inflamed', de: 'Entzündet' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

const cystsPolypsOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет', en: 'No', de: 'Nein' } },
  { value: 'cysts', label: { ru: 'Кисты', en: 'Cysts', de: 'Zysten' } },
  { value: 'polyps', label: { ru: 'Полипы', en: 'Polyps', de: 'Polypen' } },
  { value: 'fibroids', label: { ru: 'Миомы', en: 'Fibroids', de: 'Myome' } },
  { value: 'tumors', label: { ru: 'Опухоли', en: 'Tumors', de: 'Tumore' } },
  { value: 'hernias', label: { ru: 'Грыжи', en: 'Hernias', de: 'Hernien' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

const herpesWartsOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет', en: 'No', de: 'Nein' } },
  { value: 'herpes', label: { ru: 'Герпес', en: 'Herpes', de: 'Herpes' } },
  { value: 'papillomas', label: { ru: 'Папилломы', en: 'Papillomas', de: 'Papillome' } },
  { value: 'moles', label: { ru: 'Родинки', en: 'Moles', de: 'Muttermale' } },
  { value: 'warts', label: { ru: 'Бородавки', en: 'Warts', de: 'Warzen' } },
  { value: 'red_spots', label: { ru: 'Красные точки на коже', en: 'Red spots on skin', de: 'Rote Punkte auf der Haut' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

const menstruationDetailedOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Регулярные, нормальные', en: 'Regular, normal', de: 'Regelmäßig, normal' } },
  { value: 'irregular', label: { ru: 'Нерегулярные', en: 'Irregular', de: 'Unregelmäßig' } },
  { value: 'painful', label: { ru: 'Болезненные', en: 'Painful', de: 'Schmerzhaft' } },
  { value: 'prolonged', label: { ru: 'Затяжные', en: 'Prolonged', de: 'Verlängert' } },
  { value: 'heavy_bleeding', label: { ru: 'Обильные кровотечения', en: 'Heavy bleeding', de: 'Starke Blutungen' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

const prostatitisOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'acute', label: { ru: 'Острый простатит', en: 'Acute prostatitis', de: 'Akute Prostatitis' } },
  { value: 'chronic', label: { ru: 'Хронический простатит', en: 'Chronic prostatitis', de: 'Chronische Prostatitis' } },
  { value: 'symptoms', label: { ru: 'Есть симптомы', en: 'Have symptoms', de: 'Habe Symptome' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

const skinProblemsDetailedOptions: QuestionOption[] = [
  { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
  { value: 'acne', label: { ru: 'Прыщи', en: 'Acne', de: 'Akne' } },
  { value: 'furuncles', label: { ru: 'Фурункулы', en: 'Furuncles', de: 'Furunkel' } },
  { value: 'acne_vulgaris', label: { ru: 'Акне', en: 'Acne vulgaris', de: 'Akne vulgaris' } },
  { value: 'irritation', label: { ru: 'Раздражение', en: 'Irritation', de: 'Reizung' } },
  { value: 'rosacea', label: { ru: 'Розацеа', en: 'Rosacea', de: 'Rosazea' } },
  { value: 'psoriasis', label: { ru: 'Псориаз', en: 'Psoriasis', de: 'Psoriasis' } },
  { value: 'dermatitis', label: { ru: 'Дерматит', en: 'Dermatitis', de: 'Dermatitis' } },
  { value: 'eczema', label: { ru: 'Экзема', en: 'Eczema', de: 'Ekzem' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

const coldsFrequencyOptions: QuestionOption[] = [
  { value: 'rarely', label: { ru: 'Редко (1-2 раза в год)', en: 'Rarely (1-2 times a year)', de: 'Selten (1-2 mal im Jahr)' } },
  { value: 'sometimes', label: { ru: 'Иногда (3-4 раза в год)', en: 'Sometimes (3-4 times a year)', de: 'Manchmal (3-4 mal im Jahr)' } },
  { value: 'often', label: { ru: 'Часто (5+ раз в год)', en: 'Often (5+ times a year)', de: 'Oft (5+ mal im Jahr)' } },
];

const medicationUsageOptions: QuestionOption[] = [
  { value: 'no_antibiotics', label: { ru: 'Не пользуюсь', en: 'Not using', de: 'Verwende nicht' } },
  { value: 'antibiotics', label: { ru: 'Антибиотики', en: 'Antibiotics', de: 'Antibiotika' } },
  { value: 'antipyretics', label: { ru: 'Жаропонижающие', en: 'Antipyretics', de: 'Fiebersenkende Mittel' } },
  { value: 'both', label: { ru: 'И антибиотики, и жаропонижающие', en: 'Both antibiotics and antipyretics', de: 'Sowohl Antibiotika als auch fiebersenkende Mittel' } },
];

const lifestyleOptions: QuestionOption[] = [
  { value: 'sedentary', label: { ru: 'Сидячий', en: 'Sedentary', de: 'Sitzend' } },
  { value: 'sport', label: { ru: 'Спорт', en: 'Sport', de: 'Sport' } },
  { value: 'home_exercise', label: { ru: 'Домашняя гимнастика', en: 'Home exercise', de: 'Hausgymnastik' } },
  { value: 'cold_showers', label: { ru: 'Холодные обливания', en: 'Cold showers', de: 'Kalte Duschen' } },
  { value: 'stressful_work', label: { ru: 'Стрессовая работа', en: 'Stressful work', de: 'Stressige Arbeit' } },
  { value: 'physical_load', label: { ru: 'Физические нагрузки', en: 'Physical load', de: 'Körperliche Belastung' } },
  { value: 'toxic_substances', label: { ru: 'Токсичные вещества на работе', en: 'Toxic substances at work', de: 'Giftige Stoffe bei der Arbeit' } },
  { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
];

// Infant questionnaire (type = infant)
export const infantQuestionnaire: QuestionnaireSection[] = [
  {
    id: 'personal',
    title: { ru: 'Личные данные', en: 'Personal Information', de: 'Persönliche Daten' },
    icon: 'user',
    questions: [
      {
        id: 'name',
        type: 'text',
        label: { ru: 'Имя', en: 'Name', de: 'Vorname' },
        icon: 'user',
        required: true,
        hasAdditional: false,
      },
      {
        id: 'last_name',
        type: 'text',
        label: { ru: 'Фамилия', en: 'Last Name', de: 'Nachname' },
        icon: 'user',
        required: true,
        hasAdditional: false,
      },
      {
        id: 'age_months',
        type: 'number',
        label: { ru: 'Возраст (в месяцах)', en: 'Age (in months)', de: 'Alter (in Monaten)' },
        icon: 'calendar',
        required: true,
        hasAdditional: false,
      },
      {
        id: 'weight',
        type: 'number',
        label: { ru: 'Вес (кг)', en: 'Weight (kg)', de: 'Gewicht (kg)' },
        icon: 'scale',
        required: true,
        hasAdditional: false,
      },
    ],
  },
  {
    id: 'health',
    title: { ru: 'Здоровье', en: 'Health', de: 'Gesundheit' },
    icon: 'heart',
    questions: [
      {
        id: 'digestion',
        type: 'checkbox',
        label: { ru: 'Пищеварение', en: 'Digestion', de: 'Verdauung' },
        icon: 'heart',
        options: digestionOptions,
        required: true,
        hasAdditional: false,
      },
      {
        id: 'sweats_at_night',
        type: 'radio',
        label: { ru: 'Потеет во сне', en: 'Sweats at night', de: 'Schwitzt nachts' },
        icon: 'droplets',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: false,
      },
      {
        id: 'bad_breath',
        type: 'radio',
        label: { ru: 'Есть ли неприятный запах изо рта', en: 'Is there bad breath', de: 'Gibt es Mundgeruch' },
        icon: 'wind',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: false,
      },
      {
        id: 'skin_condition',
        type: 'checkbox',
        label: { ru: 'Родинки / бородавки / высыпания / экзема', en: 'Moles / warts / rashes / eczema', de: 'Muttermale / Warzen / Ausschläge / Ekzeme' },
        icon: 'sparkles',
        options: skinOptions,
        required: true,
        hasAdditional: true,
      },
      {
        id: 'allergies',
        type: 'checkbox',
        label: { ru: 'Аллергия', en: 'Allergies', de: 'Allergien' },
        icon: 'flower',
        options: allergyOptions,
        required: true,
        hasAdditional: true,
      },
      {
        id: 'water_per_day',
        type: 'number',
        label: { ru: 'Сколько воды в день пьёт ребенок (миллилитров)', en: 'How much water does the child drink per day (milliliters)', de: 'Wie viel Wasser trinkt das Kind pro Tag (Milliliter)' },
        icon: 'droplet',
        required: true,
        hasAdditional: false,
      },
      {
        id: 'injuries',
        type: 'checkbox',
        label: { ru: 'Травмы / операции / удары по голове / переломы', en: 'Injuries / surgeries / head trauma / fractures', de: 'Verletzungen / Operationen / Kopftrauma / Brüche' },
        icon: 'activity',
        options: injuriesOptions,
        required: true,
        hasAdditional: true,
      },
      {
        id: 'sleep_quality',
        type: 'radio',
        label: { ru: 'Хорошо ли спит', en: 'Does the child sleep well', de: 'Schläft das Kind gut' },
        icon: 'moon',
        options: sleepOptionsSimple,
        required: true,
        hasAdditional: false,
      },
      {
        id: 'illness_antibiotics',
        type: 'checkbox',
        label: { ru: 'Часто ли болеет / принимал ли антибиотики или лекарства', en: 'Is often ill / has taken antibiotics or medications', de: 'Ist oft krank / hat Antibiotika oder Medikamente genommen' },
        icon: 'pill',
        options: illnessAntibioticsOptions,
        required: true,
        hasAdditional: true,
      },
    ],
  },
  {
    id: 'birth_pregnancy',
    title: { ru: 'Роды и беременность', en: 'Birth and Pregnancy', de: 'Geburt und Schwangerschaft' },
    icon: 'baby',
    questions: [
      {
        id: 'birth_type',
        type: 'radio',
        label: { ru: 'Как прошли роды', en: 'How was the birth', de: 'Wie war die Geburt' },
        icon: 'baby',
        options: birthOptions,
        required: true,
        hasAdditional: false,
      },
      {
        id: 'mother_toxicosis',
        type: 'radio',
        label: { ru: 'Был ли у мамы сильный токсикоз при беременности', en: 'Did mother have severe toxicosis during pregnancy', de: 'Hatte die Mutter starke Toxikose während der Schwangerschaft' },
        icon: 'alert-circle',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: false,
      },
      {
        id: 'mother_allergy',
        type: 'radio',
        label: { ru: 'Была ли у мамы аллергия до или во время беременности', en: 'Did mother have allergies before or during pregnancy', de: 'Hatte die Mutter Allergien vor oder während der Schwangerschaft' },
        icon: 'flower',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: false,
      },
      {
        id: 'mother_constipation',
        type: 'radio',
        label: { ru: 'Был ли у мамы запор', en: 'Did mother have constipation', de: 'Hatte die Mutter Verstopfung' },
        icon: 'alert-triangle',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: false,
      },
      {
        id: 'mother_antibiotics',
        type: 'radio',
        label: { ru: 'Пила ли мама антибиотики во время беременности', en: 'Did mother take antibiotics during pregnancy', de: 'Nahm die Mutter Antibiotika während der Schwangerschaft' },
        icon: 'pill',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: false,
      },
      {
        id: 'mother_anemia',
        type: 'radio',
        label: { ru: 'Была ли анемия у мамы', en: 'Did mother have anemia', de: 'Hatte die Mutter Anämie' },
        icon: 'heart',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: false,
      },
      {
        id: 'pregnancy_problems',
        type: 'radio',
        label: { ru: 'Были ли проблемы во время беременности', en: 'Were there problems during pregnancy', de: 'Gab es Probleme während der Schwangerschaft' },
        icon: 'file-text',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: true,
      },
      {
        id: 'what_else_question',
        type: 'radio',
        label: { ru: 'Есть ли что-то ещё, что нужно знать о здоровье ребёнка?', en: 'Is there anything else we should know about the child\'s health?', de: 'Gibt es noch etwas, was wir über die Gesundheit des Kindes wissen sollten?' },
        icon: 'info',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: false,
      },
      {
        id: 'what_else',
        type: 'textarea',
        label: { ru: 'Опишите подробнее', en: 'Please describe', de: 'Bitte beschreiben Sie' },
        icon: 'info',
        required: false,
        hasAdditional: false,
        showIf: { questionId: 'what_else_question', value: 'yes' },
        placeholder: { ru: 'Дополнительная информация', en: 'Additional information', de: 'Zusätzliche Informationen' },
      },
    ],
  },
  {
    id: 'medical_documents',
    title: { ru: 'Медицинские документы', en: 'Medical Documents', de: 'Medizinische Dokumente' },
    icon: 'file-text',
    questions: [
      {
        id: 'has_medical_documents',
        type: 'radio',
        label: { ru: 'Есть ли у вас анализы крови за последние 2-3 месяца? УЗИ?', en: 'Do you have blood test results from the last 2-3 months? Ultrasound?', de: 'Haben Sie Blutuntersuchungsergebnisse der letzten 2-3 Monate? Ultraschall?' },
        icon: 'file-text',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: false,
      },
    ],
  },
];

// Child questionnaire (type = child)
export const childQuestionnaire: QuestionnaireSection[] = [
  {
    id: 'personal',
    title: { ru: 'Личные данные', en: 'Personal Information', de: 'Persönliche Daten' },
    icon: 'user',
    questions: [
      {
        id: 'name',
        type: 'text',
        label: { ru: 'Имя', en: 'Name', de: 'Vorname' },
        icon: 'user',
        required: true,
        hasAdditional: false,
      },
      {
        id: 'last_name',
        type: 'text',
        label: { ru: 'Фамилия', en: 'Last Name', de: 'Nachname' },
        icon: 'user',
        required: true,
        hasAdditional: false,
      },
      {
        id: 'age',
        type: 'number',
        label: { ru: 'Возраст (от 1 до 12 лет)', en: 'Age (1 to 12 years)', de: 'Alter (1 bis 12 Jahre)' },
        icon: 'calendar',
        required: true,
        hasAdditional: false,
        min: 1,
        max: 12,
      },
      {
        id: 'weight',
        type: 'number',
        label: { ru: 'Вес (кг)', en: 'Weight (kg)', de: 'Gewicht (kg)' },
        icon: 'scale',
        required: true,
        hasAdditional: false,
      },
    ],
  },
  {
    id: 'health',
    title: { ru: 'Здоровье', en: 'Health', de: 'Gesundheit' },
    icon: 'heart',
    questions: [
      {
        id: 'digestion',
        type: 'checkbox',
        label: { ru: 'Пищеварение', en: 'Digestion', de: 'Verdauung' },
        icon: 'heart',
        options: digestionOptionsExtended,
        required: true,
        hasAdditional: false,
      },
      {
        id: 'teeth_decay',
        type: 'radio',
        label: { ru: 'Зубы быстро портятся', en: 'Teeth decay quickly', de: 'Zähne verderben schnell' },
        icon: 'smile',
        options: yesNoOptions,
        required: true,
        hasAdditional: false,
      },
      {
        id: 'sweats_grinds',
        type: 'checkbox',
        label: { ru: 'Потеет во сне / скрипит зубами', en: 'Sweats at night / grinds teeth', de: 'Schwitzt nachts / knirscht mit den Zähnen' },
        icon: 'moon',
        options: [
          { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
          { value: 'sweats', label: { ru: 'Потеет во сне', en: 'Sweats at night', de: 'Schwitzt nachts' } },
          { value: 'grinds', label: { ru: 'Скрипит зубами', en: 'Grinds teeth', de: 'Knirscht mit den Zähnen' } },
        ],
        required: true,
        hasAdditional: false,
      },
      {
        id: 'bad_breath',
        type: 'radio',
        label: { ru: 'Неприятный запах изо рта', en: 'Bad breath', de: 'Mundgeruch' },
        icon: 'wind',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: false,
      },
      {
        id: 'sugar_dependency',
        type: 'text',
        label: { ru: 'Зависимость от сладкого', en: 'Sugar dependency', de: 'Zuckerabhängigkeit' },
        icon: 'candy',
        required: true,
        hasAdditional: false,
        placeholder: { ru: 'Опишите', en: 'Describe', de: 'Beschreiben' },
      },
      {
        id: 'skin_condition',
        type: 'checkbox',
        label: { ru: 'Родинки / бородавки / высыпания / экзема', en: 'Moles / warts / rashes / eczema', de: 'Muttermale / Warzen / Ausschläge / Ekzeme' },
        icon: 'sparkles',
        options: skinOptions,
        required: true,
        hasAdditional: true,
      },
      {
        id: 'allergies',
        type: 'checkbox',
        label: { ru: 'Аллергия', en: 'Allergies', de: 'Allergien' },
        icon: 'flower',
        options: allergyOptions,
        required: true,
        hasAdditional: true,
      },
      {
        id: 'hyperactive',
        type: 'radio',
        label: { ru: 'Гиперактивный или часто жалуется на усталость', en: 'Hyperactive or often complains of tiredness', de: 'Hyperaktiv oder klagt oft über Müdigkeit' },
        icon: 'zap',
        options: hyperactiveOptions,
        required: true,
        hasAdditional: false,
      },
      {
        id: 'water_per_day',
        type: 'radio',
        label: { ru: 'Сколько воды в день (литров)', en: 'Water per day (liters)', de: 'Wasser pro Tag (Liter)' },
        icon: 'droplet',
        options: waterOptions,
        required: true,
        hasAdditional: false,
      },
      {
        id: 'injuries',
        type: 'checkbox',
        label: { ru: 'Травмы / операции / удары по голове / переломы', en: 'Injuries / surgeries / head trauma / fractures', de: 'Verletzungen / Operationen / Kopftrauma / Brüche' },
        icon: 'activity',
        options: injuriesOptions,
        required: true,
        hasAdditional: true,
      },
      {
        id: 'headaches_sleep',
        type: 'checkbox',
        label: { ru: 'Головные боли и сон', en: 'Headaches and sleep', de: 'Kopfschmerzen und Schlaf' },
        icon: 'brain',
        options: headachesSleepOptions,
        required: true,
        hasAdditional: false,
      },
      {
        id: 'illness_antibiotics',
        type: 'checkbox',
        label: { ru: 'Простуды и лекарства', en: 'Colds and medications', de: 'Erkältungen und Medikamente' },
        icon: 'pill',
        options: illnessAntibioticsOptions,
        required: true,
        hasAdditional: false,
      },
      {
        id: 'what_else_question',
        type: 'radio',
        number: 28,
        label: { ru: '28. Есть ли что-то ещё, что нужно знать о вашем здоровье?', en: '28. Is there anything else we should know about your health?', de: '28. Gibt es noch etwas, was wir über Ihre Gesundheit wissen sollten?' },
        icon: 'info',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: false,
      },
      {
        id: 'what_else',
        type: 'textarea',
        number: 28.1,
        label: { ru: '28.1. Опишите подробнее', en: '28.1. Please describe', de: '28.1. Bitte beschreiben Sie' },
        icon: 'info',
        required: false,
        hasAdditional: false,
        placeholder: { ru: 'Дополнительная информация', en: 'Additional information', de: 'Zusätzliche Informationen' },
        showIf: { questionId: 'what_else_question', value: 'yes' },
      },
    ],
  },
  {
    id: 'medical_documents',
    title: { ru: 'Медицинские документы', en: 'Medical Documents', de: 'Medizinische Dokumente' },
    icon: 'file-text',
    questions: [
      {
        id: 'has_medical_documents',
        type: 'radio',
        number: 29,
        label: { ru: '29. Есть ли у вас анализы крови за последние 2-3 месяца? УЗИ?', en: '29. Do you have blood test results from the last 2-3 months? Ultrasound?', de: '29. Haben Sie Blutuntersuchungsergebnisse der letzten 2-3 Monate? Ultraschall?' },
        icon: 'file-text',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: false,
      },
    ],
  },
];

// Woman questionnaire (type = woman)
export const womanQuestionnaire: QuestionnaireSection[] = [
  {
    id: 'personal',
    title: { ru: 'Личные данные', en: 'Personal Information', de: 'Persönliche Daten' },
    icon: 'user',
    questions: [
      {
        id: 'name',
        type: 'text',
        label: { ru: 'Имя', en: 'Name', de: 'Vorname' },
        icon: 'user',
        required: true,
        hasAdditional: false,
      },
      {
        id: 'last_name',
        type: 'text',
        label: { ru: 'Фамилия', en: 'Last Name', de: 'Nachname' },
        icon: 'user',
        required: true,
        hasAdditional: false,
      },
      {
        id: 'age',
        type: 'number',
        label: { ru: 'Возраст', en: 'Age', de: 'Alter' },
        icon: 'calendar',
        required: true,
        hasAdditional: false,
      },
      {
        id: 'weight',
        type: 'number',
        label: { ru: 'Вес (кг)', en: 'Weight (kg)', de: 'Gewicht (kg)' },
        icon: 'scale',
        required: true,
        hasAdditional: false,
      },
    ],
  },
  {
    id: 'health',
    title: { ru: 'Здоровье', en: 'Health', de: 'Gesundheit' },
    icon: 'heart',
    questions: [
      // 1. Довольны ли вы своим весом?
      {
        id: 'weight_satisfaction',
        type: 'radio',
        number: 1,
        label: { ru: '1. Довольны ли вы своим весом?', en: '1. Are you satisfied with your weight?', de: '1. Sind Sie mit Ihrem Gewicht zufrieden?' },
        icon: 'scale',
        options: [
          { value: 'satisfied', label: { ru: 'Да, довольна', en: 'Yes, satisfied', de: 'Ja, zufrieden' } },
          { value: 'not_satisfied', label: { ru: 'Нет, недовольна', en: 'No, not satisfied', de: 'Nein, nicht zufrieden' } },
        ],
        required: true,
        hasAdditional: false,
      },
      // 1.1. Если недовольны — что хотите сделать и сколько килограмм
      {
        id: 'weight_goal',
        type: 'radio',
        number: 1.1,
        label: { ru: '1.1. Что хотите сделать с весом?', en: '1.1. What do you want to do with your weight?', de: '1.1. Was möchten Sie mit Ihrem Gewicht tun?' },
        icon: 'target',
        options: [
          { value: 'lose', label: { ru: 'Сбросить вес', en: 'Lose weight', de: 'Gewicht verlieren' } },
          { value: 'gain', label: { ru: 'Набрать вес', en: 'Gain weight', de: 'Gewicht zunehmen' } },
        ],
        required: false,
        hasAdditional: true,
        showIf: { questionId: 'weight_satisfaction', value: 'not_satisfied' },
      },
      // 2. Сколько воды в день Вы пьете?
      {
        id: 'water_per_day',
        type: 'radio',
        number: 2,
        label: { ru: '2. Сколько воды в день пьёте? (только вода, не чай/кофе)', en: '2. How much water do you drink per day? (water only)', de: '2. Wie viel Wasser trinken Sie pro Tag? (nur Wasser)' },
        icon: 'droplet',
        options: waterOptions,
        required: true,
        hasAdditional: false,
      },
      // 3. Был ли ковид?
      {
        id: 'had_covid',
        type: 'radio',
        number: 3,
        label: { ru: '3. Был ли у вас ковид?', en: '3. Did you have COVID?', de: '3. Hatten Sie COVID?' },
        icon: 'shield',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: false,
      },
      // 3.1. Сколько раз был ковид?
      {
        id: 'covid_times',
        type: 'number',
        number: 3.1,
        label: { ru: '3.1. Сколько раз болели ковидом?', en: '3.1. How many times did you have COVID?', de: '3.1. Wie oft hatten Sie COVID?' },
        icon: 'shield',
        required: true,
        hasAdditional: false,
        min: 1,
        max: 10,
        placeholder: { ru: 'Введите число', en: 'Enter number', de: 'Zahl eingeben' },
        showIf: { questionId: 'had_covid', value: 'yes' },
      },
      // 3.2. Была ли вакцина от ковида?
      {
        id: 'had_vaccine',
        type: 'radio',
        number: 3.2,
        label: { ru: '3.2. Делали вакцину от ковида?', en: '3.2. Did you get COVID vaccine?', de: '3.2. Haben Sie COVID-Impfung erhalten?' },
        icon: 'shield',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: false,
      },
      // 3.3. Сколько доз вакцины?
      {
        id: 'vaccine_doses',
        type: 'number',
        number: 3.3,
        label: { ru: '3.3. Сколько доз вакцины получили?', en: '3.3. How many vaccine doses did you receive?', de: '3.3. Wie viele Impfdosen haben Sie erhalten?' },
        icon: 'shield',
        required: true,
        hasAdditional: false,
        min: 1,
        max: 10,
        placeholder: { ru: 'Введите число', en: 'Enter number', de: 'Zahl eingeben' },
        showIf: { questionId: 'had_vaccine', value: 'yes' },
      },
      // 3.4. Были ли осложнения после ковида?
      {
        id: 'covid_complications',
        type: 'checkbox',
        number: 3.4,
        label: { ru: '3.4. Осложнения после ковида?', en: '3.4. Complications after COVID?', de: '3.4. Komplikationen nach COVID?' },
        icon: 'alert-circle',
        options: covidComplicationsOptions,
        required: true,
        hasAdditional: true,
        showIf: { questionId: 'had_covid', value: 'yes' },
      },
      // 4. Состояние волос
      {
        id: 'hair_quality',
        type: 'checkbox',
        number: 4,
        label: { ru: '4. Качество волос', en: '4. Hair quality', de: '4. Haarqualität' },
        icon: 'sparkles',
        options: hairQualityOptions,
        required: true,
        hasAdditional: true,
      },
      // 5. Зубы
      {
        id: 'teeth_problems',
        type: 'checkbox',
        number: 5,
        label: { ru: '5. Зубы', en: '5. Teeth', de: '5. Zähne' },
        icon: 'smile',
        options: teethProblemsOptions,
        required: true,
        hasAdditional: true,
      },
      // 6. Пищеварение
      {
        id: 'digestion_detailed',
        type: 'checkbox',
        number: 6,
        label: { ru: '6. Пищеварение', en: '6. Digestion', de: '6. Verdauung' },
        icon: 'heart',
        options: digestionDetailedOptions,
        required: true,
        hasAdditional: true,
      },
      // 7. Песок или камни
      {
        id: 'stones_kidneys_gallbladder',
        type: 'checkbox',
        number: 7,
        label: { ru: '7. Песок или камни в желчном/почках', en: '7. Sand or stones in gallbladder/kidneys', de: '7. Sand oder Steine in Gallenblase/Nieren' },
        icon: 'circle',
        options: [
          { value: 'no_issues', label: { ru: 'Нет', en: 'No', de: 'Nein' } },
          { value: 'sand_kidneys', label: { ru: 'Песок в почках', en: 'Sand in kidneys', de: 'Sand in Nieren' } },
          { value: 'sand_gallbladder', label: { ru: 'Песок в желчном', en: 'Sand in gallbladder', de: 'Sand in Gallenblase' } },
          { value: 'stones_kidneys', label: { ru: 'Камни в почках', en: 'Stones in kidneys', de: 'Steine in Nieren' } },
          { value: 'stones_gallbladder', label: { ru: 'Камни в желчном', en: 'Stones in gallbladder', de: 'Steine in Gallenblase' } },
        ],
        required: true,
        hasAdditional: true,
      },
      // 8. Операции и травмы
      {
        id: 'operations_traumas',
        type: 'checkbox',
        number: 8,
        label: { ru: '8. Операции и травмы', en: '8. Operations and injuries', de: '8. Operationen und Verletzungen' },
        icon: 'scissors',
        options: operationsTraumasOptions,
        required: true,
        hasAdditional: true,
      },
      // 9. Давление
      {
        id: 'blood_pressure',
        type: 'radio',
        number: 9,
        label: { ru: '9. Давление', en: '9. Blood pressure', de: '9. Blutdruck' },
        icon: 'activity',
        options: pressureOptions,
        required: true,
        hasAdditional: true,
      },
      // 10. Хронические заболевания
      {
        id: 'chronic_diseases',
        type: 'checkbox',
        number: 10,
        label: { ru: '10. Хронические или аутоиммунные заболевания', en: '10. Chronic or autoimmune diseases', de: '10. Chronische oder autoimmune Erkrankungen' },
        icon: 'alert-circle',
        options: chronicDiseasesOptions,
        required: true,
        hasAdditional: true,
      },
      // 11. Головные боли
      {
        id: 'headaches_detailed',
        type: 'checkbox',
        number: 11,
        label: { ru: '11. Головные боли', en: '11. Headaches', de: '11. Kopfschmerzen' },
        icon: 'brain',
        options: headachesDetailedOptions,
        required: true,
        hasAdditional: true,
      },
      // 12. Онемение конечностей
      {
        id: 'numbness_cold_limbs',
        type: 'checkbox',
        number: 12,
        label: { ru: '12. Онемение и холодные конечности', en: '12. Numbness and cold limbs', de: '12. Taubheit und kalte Gliedmaßen' },
        icon: 'thermometer',
        options: numbnessOptions,
        required: true,
        hasAdditional: false,
      },
      // 13. Варикоз, геморрой
      {
        id: 'varicose_hemorrhoids_pigment',
        type: 'checkbox',
        number: 13,
        label: { ru: '13. Варикоз, геморрой, пигментация', en: '13. Varicose veins, hemorrhoids, pigmentation', de: '13. Krampfadern, Hämorrhoiden, Pigmentierung' },
        icon: 'heart',
        options: varicoseHemorrhoidsDetailedOptions,
        required: true,
        hasAdditional: true,
      },
      // 14. Суставы
      {
        id: 'joints_detailed',
        type: 'checkbox',
        number: 14,
        label: { ru: '14. Суставы', en: '14. Joints', de: '14. Gelenke' },
        icon: 'bone',
        options: jointsDetailedOptions,
        required: true,
        hasAdditional: true,
      },
      // 15. Кисты, полипы
      {
        id: 'cysts_polyps_tumors',
        type: 'checkbox',
        number: 15,
        label: { ru: '15. Кисты, полипы, опухоли', en: '15. Cysts, polyps, tumors', de: '15. Zysten, Polypen, Tumore' },
        icon: 'circle',
        options: cystsPolypsOptions,
        required: true,
        hasAdditional: true,
      },
      // 16. Герпес, папилломы, выделения
      {
        id: 'herpes_warts_discharge',
        type: 'checkbox',
        number: 16,
        label: { ru: '16. Герпес, папилломы, выделения, цистит', en: '16. Herpes, papillomas, discharge, cystitis', de: '16. Herpes, Papillome, Ausfluss, Zystitis' },
        icon: 'alert-circle',
        options: [
          ...herpesWartsOptions,
          { value: 'thrush', label: { ru: 'Молочница', en: 'Thrush', de: 'Soor' } },
          { value: 'cystitis', label: { ru: 'Цистит', en: 'Cystitis', de: 'Zystitis' } },
        ],
        required: true,
        hasAdditional: true,
      },
      // 17. Месячные
      {
        id: 'menstruation_detailed',
        type: 'checkbox',
        number: 17,
        label: { ru: '17. Месячные', en: '17. Menstruation', de: '17. Menstruation' },
        icon: 'calendar',
        options: menstruationDetailedOptions,
        required: true,
        hasAdditional: true,
      },
      // 18. Проблемы с кожей
      {
        id: 'skin_problems_detailed',
        type: 'checkbox',
        number: 18,
        label: { ru: '18. Проблемы с кожей', en: '18. Skin problems', de: '18. Hautprobleme' },
        icon: 'sparkles',
        options: skinProblemsDetailedOptions,
        required: true,
        hasAdditional: true,
      },
      // 19. Аллергия
      {
        id: 'allergies_detailed',
        type: 'checkbox',
        number: 19,
        label: { ru: '19. Аллергия', en: '19. Allergies', de: '19. Allergien' },
        icon: 'flower',
        options: allergyOptionsExtended,
        required: true,
        hasAdditional: true,
      },
      // 20. Простуды
      {
        id: 'colds_medication',
        type: 'radio',
        number: 20,
        label: { ru: '20. Простуды', en: '20. Colds', de: '20. Erkältungen' },
        icon: 'thermometer',
        options: coldsFrequencyOptions,
        required: true,
        hasAdditional: true,
      },
      // 21. Сон
      {
        id: 'sleep_problems',
        type: 'checkbox',
        number: 21,
        label: { ru: '21. Сон', en: '21. Sleep', de: '21. Schlaf' },
        icon: 'moon',
        options: [
          { value: 'good', label: { ru: 'Хороший', en: 'Good', de: 'Gut' } },
          { value: 'hard_to_fall_asleep', label: { ru: 'Трудно заснуть', en: 'Hard to fall asleep', de: 'Schwer einzuschlafen' } },
          { value: 'wake_often', label: { ru: 'Часто просыпаюсь ночью', en: 'Often wake up at night', de: 'Wache oft nachts auf' } },
          { value: 'both', label: { ru: 'Оба симптома', en: 'Both symptoms', de: 'Beide Symptome' } },
          { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
        ],
        required: true,
        hasAdditional: true,
      },
      // 22. Энергия
      {
        id: 'energy_morning',
        type: 'checkbox',
        number: 22,
        label: { ru: '22. Энергия', en: '22. Energy', de: '22. Energie' },
        icon: 'zap',
        options: [
          { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
          { value: 'hard_to_wake', label: { ru: 'Тяжело просыпаться', en: 'Hard to wake up', de: 'Schwer aufzuwachen' } },
          { value: 'unrested_morning', label: { ru: 'Утром чувствую себя неотдохнувшей', en: 'Feel unrested in the morning', de: 'Fühle mich morgens unausgeruht' } },
          { value: 'need_coffee', label: { ru: 'Нужна стимуляция кофе', en: 'Need coffee stimulation', de: 'Brauche Kaffeestimulation' } },
          { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
        ],
        required: true,
        hasAdditional: true,
      },
      // 23. Память и концентрация
      {
        id: 'memory_concentration',
        type: 'checkbox',
        number: 23,
        label: { ru: '23. Память и концентрация', en: '23. Memory and concentration', de: '23. Gedächtnis und Konzentration' },
        icon: 'brain',
        options: [
          { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
          { value: 'hard_to_concentrate', label: { ru: 'Трудно сконцентрироваться', en: 'Hard to concentrate', de: 'Schwer zu konzentrieren' } },
          { value: 'forget_names_events', label: { ru: 'Забываются имена и события', en: 'Forget names and events', de: 'Vergesse Namen und Ereignisse' } },
          { value: 'hard_to_remember', label: { ru: 'Сложно запоминать информацию', en: 'Hard to remember information', de: 'Schwer Informationen zu merken' } },
          { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
        ],
        required: true,
        hasAdditional: true,
      },
      // 24. Образ жизни
      {
        id: 'lifestyle',
        type: 'checkbox',
        number: 24,
        label: { ru: '24. Образ жизни', en: '24. Lifestyle', de: '24. Lebensstil' },
        icon: 'activity',
        options: lifestyleOptions,
        required: true,
        hasAdditional: true,
      },
      // 25. Регулярные лекарства
      {
        id: 'regular_medications',
        type: 'radio',
        number: 25,
        label: { ru: '25. Принимаете ли лекарства на постоянной основе?', en: '25. Do you take regular medications?', de: '25. Nehmen Sie regelmäßig Medikamente ein?' },
        icon: 'pill',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: true,
      },
      // 26. Анализы крови и УЗИ
      {
        id: 'has_medical_documents',
        type: 'radio',
        number: 26,
        label: { ru: '26. Есть ли анализы крови за последние 2-3 месяца? УЗИ?', en: '26. Do you have blood tests from the last 2-3 months? Ultrasound?', de: '26. Haben Sie Blutuntersuchungen der letzten 2-3 Monate? Ultraschall?' },
        icon: 'file-text',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: false,
      },
      // 27. Главный вопрос
      {
        id: 'main_concern',
        type: 'textarea',
        number: 27,
        label: { ru: '27. Какой самый важный вопрос Вас волнует в первую очередь?', en: '27. What is the most important question that concerns you first?', de: '27. Welche wichtigste Frage beschäftigt Sie in erster Linie?' },
        icon: 'help-circle',
        required: false,
        hasAdditional: false,
        placeholder: { ru: 'Опишите ваш главный вопрос', en: 'Describe your main question', de: 'Beschreiben Sie Ihre Hauptfrage' },
      },
    ],
  },
];

// Man questionnaire (type = man)
export const manQuestionnaire: QuestionnaireSection[] = [
  {
    id: 'personal',
    title: { ru: 'Личные данные', en: 'Personal Information', de: 'Persönliche Daten' },
    icon: 'user',
    questions: [
      {
        id: 'name',
        type: 'text',
        label: { ru: 'Имя', en: 'Name', de: 'Vorname' },
        icon: 'user',
        required: true,
        hasAdditional: false,
      },
      {
        id: 'last_name',
        type: 'text',
        label: { ru: 'Фамилия', en: 'Last Name', de: 'Nachname' },
        icon: 'user',
        required: true,
        hasAdditional: false,
      },
      {
        id: 'age',
        type: 'number',
        label: { ru: 'Возраст', en: 'Age', de: 'Alter' },
        icon: 'calendar',
        required: true,
        hasAdditional: false,
      },
      {
        id: 'weight',
        type: 'number',
        label: { ru: 'Вес (кг)', en: 'Weight (kg)', de: 'Gewicht (kg)' },
        icon: 'scale',
        required: true,
        hasAdditional: false,
      },
    ],
  },
  {
    id: 'health',
    title: { ru: 'Здоровье', en: 'Health', de: 'Gesundheit' },
    icon: 'heart',
    questions: [
      // 1. Довольны ли вы своим весом?
      {
        id: 'weight_satisfaction',
        type: 'radio',
        number: 1,
        label: { ru: '1. Довольны ли вы своим весом?', en: '1. Are you satisfied with your weight?', de: '1. Sind Sie mit Ihrem Gewicht zufrieden?' },
        icon: 'scale',
        options: [
          { value: 'satisfied', label: { ru: 'Да, доволен', en: 'Yes, satisfied', de: 'Ja, zufrieden' } },
          { value: 'not_satisfied', label: { ru: 'Нет, недоволен', en: 'No, not satisfied', de: 'Nein, nicht zufrieden' } },
        ],
        required: true,
        hasAdditional: false,
      },
      // 1.1. Если недовольны — что хотите сделать и сколько килограмм
      {
        id: 'weight_goal',
        type: 'radio',
        number: 1.1,
        label: { ru: '1.1. Что хотите сделать с весом?', en: '1.1. What do you want to do with your weight?', de: '1.1. Was möchten Sie mit Ihrem Gewicht tun?' },
        icon: 'target',
        options: [
          { value: 'lose', label: { ru: 'Сбросить вес', en: 'Lose weight', de: 'Gewicht verlieren' } },
          { value: 'gain', label: { ru: 'Набрать вес', en: 'Gain weight', de: 'Gewicht zunehmen' } },
        ],
        required: false,
        hasAdditional: true,
        showIf: { questionId: 'weight_satisfaction', value: 'not_satisfied' },
      },
      // 2. Сколько воды в день Вы пьете?
      {
        id: 'water_per_day',
        type: 'radio',
        number: 2,
        label: { ru: '2. Сколько воды в день пьёте? (только вода, не чай/кофе)', en: '2. How much water do you drink per day? (water only)', de: '2. Wie viel Wasser trinken Sie pro Tag? (nur Wasser)' },
        icon: 'droplet',
        options: waterOptions,
        required: true,
        hasAdditional: false,
      },
      // 3. Был ли ковид?
      {
        id: 'had_covid',
        type: 'radio',
        number: 3,
        label: { ru: '3. Был ли у вас ковид?', en: '3. Did you have COVID?', de: '3. Hatten Sie COVID?' },
        icon: 'shield',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: false,
      },
      // 3.1. Сколько раз был ковид?
      {
        id: 'covid_times',
        type: 'number',
        number: 3.1,
        label: { ru: '3.1. Сколько раз болели ковидом?', en: '3.1. How many times did you have COVID?', de: '3.1. Wie oft hatten Sie COVID?' },
        icon: 'shield',
        required: true,
        hasAdditional: false,
        min: 1,
        max: 10,
        placeholder: { ru: 'Введите число', en: 'Enter number', de: 'Zahl eingeben' },
        showIf: { questionId: 'had_covid', value: 'yes' },
      },
      // 3.2. Была ли вакцина от ковида?
      {
        id: 'had_vaccine',
        type: 'radio',
        number: 3.2,
        label: { ru: '3.2. Делали вакцину от ковида?', en: '3.2. Did you get COVID vaccine?', de: '3.2. Haben Sie COVID-Impfung erhalten?' },
        icon: 'shield',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: false,
      },
      // 3.3. Сколько доз вакцины?
      {
        id: 'vaccine_doses',
        type: 'number',
        number: 3.3,
        label: { ru: '3.3. Сколько доз вакцины получили?', en: '3.3. How many vaccine doses did you receive?', de: '3.3. Wie viele Impfdosen haben Sie erhalten?' },
        icon: 'shield',
        required: true,
        hasAdditional: false,
        min: 1,
        max: 10,
        placeholder: { ru: 'Введите число', en: 'Enter number', de: 'Zahl eingeben' },
        showIf: { questionId: 'had_vaccine', value: 'yes' },
      },
      // 3.4. Были ли осложнения после ковида?
      {
        id: 'covid_complications',
        type: 'checkbox',
        number: 3.4,
        label: { ru: '3.4. Осложнения после ковида?', en: '3.4. Complications after COVID?', de: '3.4. Komplikationen nach COVID?' },
        icon: 'alert-circle',
        options: covidComplicationsOptions,
        required: true,
        hasAdditional: true,
        showIf: { questionId: 'had_covid', value: 'yes' },
      },
      // 4. Довольны ли вы качеством волос?
      {
        id: 'hair_quality',
        type: 'radio',
        number: 4,
        label: { ru: '4. Качество волос', en: '4. Hair quality', de: '4. Haarqualität' },
        icon: 'sparkles',
        options: hairQualityOptionsMan,
        required: true,
        hasAdditional: true,
      },
      // 5. Зубы
      {
        id: 'teeth_problems',
        type: 'checkbox',
        number: 5,
        label: { ru: '5. Зубы', en: '5. Teeth', de: '5. Zähne' },
        icon: 'smile',
        options: teethProblemsOptions,
        required: true,
        hasAdditional: true,
      },
      // 6. Пищеварение
      {
        id: 'digestion_detailed',
        type: 'checkbox',
        number: 6,
        label: { ru: '6. Пищеварение', en: '6. Digestion', de: '6. Verdauung' },
        icon: 'heart',
        options: digestionDetailedOptions,
        required: true,
        hasAdditional: true,
      },
      // 7. Песок или камни
      {
        id: 'stones_kidneys_gallbladder',
        type: 'checkbox',
        number: 7,
        label: { ru: '7. Камни/песок в почках или желчном', en: '7. Stones/sand in kidneys or gallbladder', de: '7. Steine/Sand in Nieren oder Gallenblase' },
        icon: 'circle',
        options: [
          { value: 'no_issues', label: { ru: 'Нет', en: 'No', de: 'Nein' } },
          { value: 'sand_kidneys', label: { ru: 'Песок в почках', en: 'Sand in kidneys', de: 'Sand in Nieren' } },
          { value: 'sand_gallbladder', label: { ru: 'Песок в желчном', en: 'Sand in gallbladder', de: 'Sand in Gallenblase' } },
          { value: 'stones_kidneys', label: { ru: 'Камни в почках', en: 'Stones in kidneys', de: 'Steine in Nieren' } },
          { value: 'stones_gallbladder', label: { ru: 'Камни в желчном', en: 'Stones in gallbladder', de: 'Steine in Gallenblase' } },
        ],
        required: true,
        hasAdditional: true,
      },
      // 8. Операции и травмы
      {
        id: 'operations_traumas',
        type: 'checkbox',
        number: 8,
        label: { ru: '8. Операции и травмы', en: '8. Operations and injuries', de: '8. Operationen und Verletzungen' },
        icon: 'scissors',
        options: operationsTraumasOptions,
        required: true,
        hasAdditional: true,
      },
      // 9. Давление
      {
        id: 'blood_pressure',
        type: 'radio',
        number: 9,
        label: { ru: '9. Давление', en: '9. Blood pressure', de: '9. Blutdruck' },
        icon: 'activity',
        options: pressureOptions,
        required: true,
        hasAdditional: true,
      },
      // 10. Хронические заболевания
      {
        id: 'chronic_diseases',
        type: 'checkbox',
        number: 10,
        label: { ru: '10. Хронические/аутоиммунные заболевания', en: '10. Chronic/autoimmune diseases', de: '10. Chronische/autoimmune Erkrankungen' },
        icon: 'alert-circle',
        options: chronicDiseasesOptions,
        required: true,
        hasAdditional: true,
      },
      // 11. Головные боли
      {
        id: 'headaches_detailed',
        type: 'checkbox',
        number: 11,
        label: { ru: '11. Головные боли, мигрени, головокружения', en: '11. Headaches, migraines, dizziness', de: '11. Kopfschmerzen, Migräne, Schwindel' },
        icon: 'brain',
        options: headachesDetailedOptions,
        required: true,
        hasAdditional: true,
      },
      // 12. Онемение конечностей
      {
        id: 'numbness_cold_limbs',
        type: 'checkbox',
        number: 12,
        label: { ru: '12. Онемение пальцев, холодные конечности', en: '12. Numbness, cold limbs', de: '12. Taubheit, kalte Gliedmaßen' },
        icon: 'thermometer',
        options: numbnessOptions,
        required: true,
        hasAdditional: false,
      },
      // 13. Варикоз, геморрой
      {
        id: 'varicose_hemorrhoids_pigment',
        type: 'checkbox',
        number: 13,
        label: { ru: '13. Варикоз, геморрой, пигментация', en: '13. Varicose veins, hemorrhoids, pigmentation', de: '13. Krampfadern, Hämorrhoiden, Pigmentierung' },
        icon: 'heart',
        options: varicoseHemorrhoidsDetailedOptions,
        required: true,
        hasAdditional: true,
      },
      // 14. Суставы
      {
        id: 'joints_detailed',
        type: 'checkbox',
        number: 14,
        label: { ru: '14. Суставы (хруст, скрип, воспаление)', en: '14. Joints (crunch, squeak, inflammation)', de: '14. Gelenke (Knacken, Quietschen, Entzündung)' },
        icon: 'bone',
        options: jointsDetailedOptions,
        required: true,
        hasAdditional: true,
      },
      // 15. Кисты, полипы
      {
        id: 'cysts_polyps_tumors',
        type: 'checkbox',
        number: 15,
        label: { ru: '15. Кисты, полипы, миомы, опухоли, грыжи', en: '15. Cysts, polyps, fibroids, tumors, hernias', de: '15. Zysten, Polypen, Myome, Tumore, Hernien' },
        icon: 'circle',
        options: cystsPolypsOptions,
        required: true,
        hasAdditional: true,
      },
      // 16. Герпес, папилломы
      {
        id: 'herpes_warts_discharge',
        type: 'checkbox',
        number: 16,
        label: { ru: '16. Герпес, папилломы, родинки, бородавки', en: '16. Herpes, papillomas, moles, warts', de: '16. Herpes, Papillome, Muttermale, Warzen' },
        icon: 'alert-circle',
        options: [
          ...herpesWartsOptions,
          { value: 'discharge_male', label: { ru: 'Выделения (по-мужски)', en: 'Discharge (male)', de: 'Ausfluss (männlich)' } },
          { value: 'cystitis', label: { ru: 'Цистит', en: 'Cystitis', de: 'Zystitis' } },
        ],
        required: true,
        hasAdditional: false,
      },
      // 17. Простатит
      {
        id: 'prostatitis',
        type: 'checkbox',
        number: 17,
        label: { ru: '17. Простатит', en: '17. Prostatitis', de: '17. Prostatitis' },
        icon: 'alert-circle',
        options: prostatitisOptions,
        required: true,
        hasAdditional: true,
      },
      // 18. Проблемы с кожей
      {
        id: 'skin_problems_detailed',
        type: 'checkbox',
        number: 18,
        label: { ru: '18. Проблемы с кожей', en: '18. Skin problems', de: '18. Hautprobleme' },
        icon: 'sparkles',
        options: skinProblemsDetailedOptions,
        required: true,
        hasAdditional: true,
      },
      // 19. Аллергия
      {
        id: 'allergies_detailed',
        type: 'checkbox',
        number: 19,
        label: { ru: '19. Аллергия', en: '19. Allergies', de: '19. Allergien' },
        icon: 'flower',
        options: allergyOptionsExtended,
        required: true,
        hasAdditional: true,
      },
      // 20. Простуды
      {
        id: 'colds_medication',
        type: 'radio',
        number: 20,
        label: { ru: '20. Как часто простужаетесь?', en: '20. How often do you catch colds?', de: '20. Wie oft erkälten Sie sich?' },
        icon: 'thermometer',
        options: coldsFrequencyOptions,
        required: true,
        hasAdditional: true,
      },
      // 21. Сон
      {
        id: 'sleep_problems',
        type: 'checkbox',
        number: 21,
        label: { ru: '21. Сон', en: '21. Sleep', de: '21. Schlaf' },
        icon: 'moon',
        options: [
          { value: 'good', label: { ru: 'Хороший', en: 'Good', de: 'Gut' } },
          { value: 'hard_to_fall_asleep', label: { ru: 'Трудно заснуть', en: 'Hard to fall asleep', de: 'Schwer einzuschlafen' } },
          { value: 'wake_often', label: { ru: 'Часто просыпаюсь ночью', en: 'Often wake up at night', de: 'Wache oft nachts auf' } },
          { value: 'both', label: { ru: 'Оба симптома', en: 'Both symptoms', de: 'Beide Symptome' } },
          { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
        ],
        required: true,
        hasAdditional: true,
      },
      // 22. Энергия
      {
        id: 'energy_morning',
        type: 'checkbox',
        number: 22,
        label: { ru: '22. Энергия и утреннее состояние', en: '22. Energy and morning condition', de: '22. Energie und morgendlicher Zustand' },
        icon: 'zap',
        options: [
          { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
          { value: 'hard_to_wake', label: { ru: 'Тяжело просыпаться', en: 'Hard to wake up', de: 'Schwer aufzuwachen' } },
          { value: 'unrested_morning', label: { ru: 'Утром неотдохнувший', en: 'Feel unrested in the morning', de: 'Fühle mich morgens unausgeruht' } },
          { value: 'need_coffee', label: { ru: 'Нужна стимуляция кофе', en: 'Need coffee stimulation', de: 'Brauche Kaffeestimulation' } },
          { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
        ],
        required: true,
        hasAdditional: true,
      },
      // 23. Память и концентрация
      {
        id: 'memory_concentration',
        type: 'checkbox',
        number: 23,
        label: { ru: '23. Память и концентрация', en: '23. Memory and concentration', de: '23. Gedächtnis und Konzentration' },
        icon: 'brain',
        options: [
          { value: 'no_issues', label: { ru: 'Нет проблем', en: 'No issues', de: 'Keine Beschwerden' } },
          { value: 'hard_to_concentrate', label: { ru: 'Трудно сконцентрироваться', en: 'Hard to concentrate', de: 'Schwer zu konzentrieren' } },
          { value: 'forget_names_events', label: { ru: 'Забываются имена и события', en: 'Forget names and events', de: 'Vergesse Namen und Ereignisse' } },
          { value: 'hard_to_remember', label: { ru: 'Сложно запоминать', en: 'Hard to remember', de: 'Schwer zu merken' } },
          { value: 'other', label: { ru: 'Другое', en: 'Other', de: 'Andere' } },
        ],
        required: true,
        hasAdditional: true,
      },
      // 24. Образ жизни
      {
        id: 'lifestyle',
        type: 'checkbox',
        number: 24,
        label: { ru: '24. Образ жизни', en: '24. Lifestyle', de: '24. Lebensstil' },
        icon: 'activity',
        options: lifestyleOptions,
        required: true,
        hasAdditional: true,
      },
      // 25. Регулярные лекарства
      {
        id: 'regular_medications',
        type: 'radio',
        number: 25,
        label: { ru: '25. Принимаете лекарства регулярно?', en: '25. Do you take medications regularly?', de: '25. Nehmen Sie regelmäßig Medikamente?' },
        icon: 'pill',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: true,
      },
      // 26. Анализы и УЗИ
      {
        id: 'has_medical_documents',
        type: 'radio',
        number: 26,
        label: { ru: '26. Есть анализы крови/УЗИ за последние 2-3 месяца?', en: '26. Do you have blood tests/ultrasound from the last 2-3 months?', de: '26. Haben Sie Blutuntersuchungen/Ultraschall der letzten 2-3 Monate?' },
        icon: 'file-text',
        options: yesNoOptionsSimple,
        required: true,
        hasAdditional: false,
      },
      // 27. Главный вопрос
      {
        id: 'main_concern',
        type: 'textarea',
        number: 27,
        label: { ru: '27. Какой главный вопрос вас волнует?', en: '27. What is your main concern?', de: '27. Was ist Ihr Hauptanliegen?' },
        icon: 'help-circle',
        required: false,
        hasAdditional: false,
        placeholder: { ru: 'Опишите ваш главный вопрос', en: 'Describe your main question', de: 'Beschreiben Sie Ihre Hauptfrage' },
      },
    ],
  },
];

export type QuestionnaireType = 'infant' | 'child' | 'woman' | 'man';

export const getQuestionnaire = (type: QuestionnaireType): QuestionnaireSection[] => {
  switch (type) {
    case 'infant':
      return infantQuestionnaire;
    case 'child':
      return childQuestionnaire;
    case 'woman':
      return womanQuestionnaire;
    case 'man':
      return manQuestionnaire;
    default:
      return infantQuestionnaire;
  }
};

export const getQuestionnaireTitle = (type: QuestionnaireType, lang: Language): string => {
  const titles = {
    infant: { ru: 'Анкета для младенца', en: 'Infant Questionnaire', de: 'Säuglingsfragebogen' },
    child: { ru: 'Детская анкета', en: 'Child Questionnaire', de: 'Kinderfragebogen' },
    woman: { ru: 'Женская анкета', en: 'Women\'s Questionnaire', de: 'Frauenfragebogen' },
    man: { ru: 'Мужская анкета', en: 'Men\'s Questionnaire', de: 'Männerfragebogen' },
  };
  return titles[type]?.[lang] || titles[type]?.ru || '';
};
