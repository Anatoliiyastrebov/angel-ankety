'use client';

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { TelegramWebAppUser } from '@/telegram-webapp.d';
import {
  getQuestionnaire,
  getQuestionnaireTitle,
  QuestionnaireSection,
  Question,
  shouldShowQuestion,
  formatQuestionnaireAnswers,
} from '../../src/lib/questionnaire-data';

type QuestionnaireType = 'infant' | 'child' | 'woman' | 'man';
type FormData = { [key: string]: string | string[] };
type FormErrors = { [key: string]: string };

// Loading fallback
function QuestionnaireLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-medical-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="text-medical-600">Загрузка анкеты...</p>
      </div>
    </div>
  );
}

// Wrapper component with Suspense
export default function QuestionnairePage() {
  return (
    <Suspense fallback={<QuestionnaireLoading />}>
      <QuestionnaireContent />
    </Suspense>
  );
}

function QuestionnaireContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const type = (searchParams.get('type') as QuestionnaireType) || 'woman';
  const sections = useMemo(() => getQuestionnaire(type), [type]);
  const title = getQuestionnaireTitle(type, 'ru');

  const [user, setUser] = useState<TelegramWebAppUser | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [additionalData, setAdditionalData] = useState<FormData>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [files, setFiles] = useState<File[]>([]);

  // Загрузка пользователя из localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('telegram_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        // Предзаполнение данных
        setFormData(prev => ({
          ...prev,
          name: userData.first_name || '',
          last_name: userData.last_name || '',
        }));
      } catch {
        router.push('/');
      }
    } else {
      router.push('/');
    }
  }, [router]);

  // Обработка изменения поля
  const handleFieldChange = useCallback((questionId: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [questionId]: value }));
    // Очищаем ошибку при изменении
    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  }, [errors]);

  // Обработка дополнительных полей
  const handleAdditionalChange = useCallback((questionId: string, value: string) => {
    setAdditionalData(prev => ({ ...prev, [`${questionId}_additional`]: value }));
  }, []);

  // Валидация секции
  const validateSection = useCallback((sectionIndex: number): boolean => {
    const section = sections[sectionIndex];
    const newErrors: FormErrors = {};

    section.questions.forEach(question => {
      // Пропускаем скрытые вопросы
      if (question.showIf && !shouldShowQuestion(question, formData)) {
        return;
      }

      if (question.required) {
        const value = formData[question.id];
        if (!value || (Array.isArray(value) && value.length === 0) || 
            (typeof value === 'string' && value.trim() === '')) {
          newErrors[question.id] = 'Это поле обязательно';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [sections, formData]);

  // Следующая секция
  const handleNextSection = useCallback(() => {
    if (validateSection(currentSection)) {
      if (currentSection < sections.length - 1) {
        setCurrentSection(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [currentSection, sections.length, validateSection]);

  // Предыдущая секция
  const handlePrevSection = useCallback(() => {
    if (currentSection > 0) {
      setCurrentSection(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentSection]);

  // Отправка анкеты
  const handleSubmit = useCallback(async () => {
    if (!validateSection(currentSection)) return;
    if (!user) return;

    setIsSubmitting(true);

    try {
      // Формируем текст анкеты
      const answersText = formatQuestionnaireAnswers(sections, formData, additionalData as any, 'ru');
      
      const message = `🔔 Новая анкета!\n\n` +
        `📋 Тип: ${title}\n` +
        `👤 Имя: ${user.first_name} ${user.last_name || ''}\n` +
        `🆔 Telegram: ${user.username ? `@${user.username}` : 'не указан'}\n` +
        `🆔 ID: ${user.id}\n\n` +
        answersText;

      // Отправляем в Telegram (нужно создать API endpoint)
      const response = await fetch('/api/submit-questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          userId: user.id,
          username: user.username,
          type,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка отправки');
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error('Submit error:', error);
      setErrors({ submit: 'Ошибка отправки анкеты. Попробуйте ещё раз.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [currentSection, validateSection, user, sections, formData, additionalData, title, type]);

  // Успешная отправка
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-medical-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-medical-900 mb-4">Анкета отправлена!</h1>
          <p className="text-medical-600 mb-6">
            Спасибо за заполнение анкеты. Мы свяжемся с вами в ближайшее время.
          </p>
          <button
            onClick={() => router.push('/')}
            className="btn-primary w-full"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-medical-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-medical-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  const currentSectionData = sections[currentSection];
  const isLastSection = currentSection === sections.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-medical-50 to-white">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <header className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-medical-600 hover:text-medical-900 mb-4"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад
          </button>
          <h1 className="text-2xl font-bold text-medical-900">{title}</h1>
          <p className="text-medical-600 mt-1">
            Секция {currentSection + 1} из {sections.length}: {currentSectionData.title.ru}
          </p>
        </header>

        {/* Progress */}
        <div className="mb-8">
          <div className="h-2 bg-medical-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary-600 transition-all duration-300"
              style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Error message */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Questions */}
        <div className="bg-white rounded-2xl shadow-sm border border-medical-200 p-6 mb-6">
          <div className="space-y-6">
            {currentSectionData.questions.map((question) => {
              // Проверяем условие показа
              if (question.showIf && !shouldShowQuestion(question, formData)) {
                return null;
              }

              return (
                <QuestionField
                  key={question.id}
                  question={question}
                  value={formData[question.id] || (question.type === 'checkbox' ? [] : '')}
                  onChange={(value) => handleFieldChange(question.id, value)}
                  error={errors[question.id]}
                  additionalValue={additionalData[`${question.id}_additional`] as string}
                  onAdditionalChange={(value) => handleAdditionalChange(question.id, value)}
                  formData={formData}
                />
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          {currentSection > 0 && (
            <button
              onClick={handlePrevSection}
              className="btn-secondary flex-1"
            >
              Назад
            </button>
          )}
          {isLastSection ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-primary flex-1"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Отправка...
                </>
              ) : (
                'Отправить анкету'
              )}
            </button>
          ) : (
            <button
              onClick={handleNextSection}
              className="btn-primary flex-1"
            >
              Далее
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Компонент вопроса
interface QuestionFieldProps {
  question: Question;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  error?: string;
  additionalValue?: string;
  onAdditionalChange?: (value: string) => void;
  formData: FormData;
}

function QuestionField({ 
  question, 
  value, 
  onChange, 
  error, 
  additionalValue,
  onAdditionalChange,
  formData 
}: QuestionFieldProps) {
  
  const handleCheckboxChange = (optionValue: string, checked: boolean) => {
    const currentValues = Array.isArray(value) ? value : [];
    
    if (optionValue === 'no_issues') {
      if (checked) {
        onChange(['no_issues']);
      } else {
        onChange([]);
      }
    } else {
      if (checked) {
        const filteredValues = currentValues.filter((v) => v !== 'no_issues');
        onChange([...filteredValues, optionValue]);
      } else {
        onChange(currentValues.filter((v) => v !== optionValue));
      }
    }
  };

  // Проверяем, нужно ли показать дополнительное поле
  const showAdditionalField = useMemo(() => {
    if (!question.hasAdditional) return false;
    
    // Для вопроса о весе
    if (question.id === 'weight_goal') {
      return value === 'lose' || value === 'gain';
    }
    
    // Для вопросов с чекбоксами и опцией "other"
    if (question.type === 'checkbox') {
      const values = Array.isArray(value) ? value : [];
      return values.includes('other');
    }
    
    // Для радио с "yes"
    if (question.type === 'radio') {
      return value === 'yes';
    }
    
    return false;
  }, [question, value]);

  const renderInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <input
            type="text"
            className={`w-full px-4 py-3 rounded-lg border ${error ? 'border-red-400' : 'border-medical-300'} bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder?.ru || ''}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            className={`w-full px-4 py-3 rounded-lg border ${error ? 'border-red-400' : 'border-medical-300'} bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            min={question.min}
            max={question.max}
            step="0.1"
          />
        );

      case 'textarea':
        return (
          <textarea
            className={`w-full px-4 py-3 rounded-lg border ${error ? 'border-red-400' : 'border-medical-300'} bg-white min-h-[120px] resize-y transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder?.ru || ''}
          />
        );

      case 'radio':
        return (
          <div className="flex flex-wrap gap-2">
            {question.options?.map((option) => {
              const isSelected = value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange(option.value)}
                  className={`px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border ${
                    isSelected
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-medical-700 border-medical-300 hover:border-primary-500'
                  }`}
                >
                  {option.label.ru}
                </button>
              );
            })}
          </div>
        );

      case 'checkbox':
        const currentValues = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-wrap gap-2">
            {question.options?.map((option) => {
              const isSelected = currentValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleCheckboxChange(option.value, !isSelected)}
                  className={`px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border ${
                    isSelected
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-medical-700 border-medical-300 hover:border-primary-500'
                  }`}
                >
                  {option.label.ru}
                </button>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-base font-medium text-medical-800">
          {question.number && `${question.number}. `}
          {question.label.ru}
        </span>
        {question.required && <span className="text-red-500">*</span>}
      </div>

      {renderInput()}

      {/* Дополнительное поле */}
      {showAdditionalField && onAdditionalChange && (
        <div className="mt-3 pl-4 border-l-2 border-primary-200">
          <label className="text-sm font-medium text-medical-600 mb-2 block">
            {question.id === 'weight_goal' 
              ? 'Сколько килограмм?' 
              : 'Укажите подробнее'}
            <span className="text-red-500 ml-1">*</span>
          </label>
          {question.id === 'weight_goal' ? (
            <input
              type="number"
              min="0"
              step="0.5"
              className="w-full px-4 py-3 rounded-lg border border-medical-300 bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={additionalValue || ''}
              onChange={(e) => onAdditionalChange(e.target.value)}
              placeholder="Например: 5"
            />
          ) : (
            <textarea
              className="w-full px-4 py-3 rounded-lg border border-medical-300 bg-white min-h-[80px] resize-y transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={additionalValue || ''}
              onChange={(e) => onAdditionalChange(e.target.value)}
              placeholder="Опишите подробнее..."
            />
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
