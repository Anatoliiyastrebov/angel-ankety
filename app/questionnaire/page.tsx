'use client';

import { useEffect, useState, useCallback, useMemo, Suspense, useRef, memo } from 'react';
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
  const [medicalFiles, setMedicalFiles] = useState<File[]>([]);

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
    // Если ответ на вопрос о документах изменился на "нет", очищаем файлы
    if (questionId === 'has_medical_documents' && value === 'no') {
      setMedicalFiles([]);
    }
  }, [errors]);

  // Обработка дополнительных полей
  const handleAdditionalChange = useCallback((questionId: string, value: string) => {
    setAdditionalData(prev => ({ ...prev, [`${questionId}_additional`]: value }));
  }, []);

  // Обработка загрузки файлов
  const handleFilesChange = useCallback((files: File[]) => {
    setMedicalFiles(prev => [...prev, ...files]);
  }, []);

  // Удаление файла
  const handleRemoveFile = useCallback((index: number) => {
    setMedicalFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Валидация всей формы
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    sections.forEach(section => {
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
    });

    setErrors(newErrors);
    
    // Прокрутка к первой ошибке
    if (Object.keys(newErrors).length > 0) {
      const firstErrorId = Object.keys(newErrors)[0];
      const element = document.getElementById(`question-${firstErrorId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return Object.keys(newErrors).length === 0;
  }, [sections, formData]);

  // Отправка анкеты
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;
    if (!user) return;

    setIsSubmitting(true);

    try {
      // Формируем текст анкеты
      const answersText = formatQuestionnaireAnswers(sections, formData, additionalData as any, 'ru');
      
      // Экранируем HTML-символы в ответах
      const escapeHtml = (text: string) => text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      const escapedAnswers = escapeHtml(answersText);
      
      // Формируем сообщение - только ответы + ссылка на профиль в конце
      const message = `🔔 <b>Новая анкета!</b>\n\n` +
        escapedAnswers +
        (medicalFiles.length > 0 ? `\n\n📎 Прикреплено файлов: ${medicalFiles.length}` : '') +
        `\n\n👤 <a href="tg://user?id=${user.id}">Открыть профиль</a>`;

      // Создаем FormData для отправки файлов
      const submitData = new FormData();
      submitData.append('message', message);
      submitData.append('userId', String(user.id));
      submitData.append('username', user.username || '');
      submitData.append('type', type);
      
      // Добавляем файлы
      medicalFiles.forEach((file, index) => {
        submitData.append(`file_${index}`, file);
      });

      const response = await fetch('/api/submit-questionnaire', {
        method: 'POST',
        body: submitData,
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
  }, [validateForm, user, sections, formData, additionalData, title, type, medicalFiles]);

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
            Заполните все поля анкеты
          </p>
        </header>

        {/* Error message */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* All Sections */}
        <div className="space-y-8">
          {sections.map((section, sectionIndex) => (
            <div 
              key={section.id} 
              className="bg-white rounded-2xl shadow-sm border border-medical-200 overflow-hidden"
            >
              {/* Section Header */}
              <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-6 py-4 border-b border-medical-200">
                <h2 className="text-lg font-semibold text-medical-900">
                  {section.title.ru}
                </h2>
              </div>

              {/* Section Questions */}
              <div className="p-6 space-y-6">
                {section.questions.map((question) => {
                  // Проверяем условие показа
                  if (question.showIf && !shouldShowQuestion(question, formData)) {
                    return null;
                  }

                  return (
                    <div key={question.id} id={`question-${question.id}`}>
                      <QuestionField
                        question={question}
                        value={formData[question.id] || (question.type === 'checkbox' ? [] : '')}
                        onChange={(value) => handleFieldChange(question.id, value)}
                        error={errors[question.id]}
                        additionalValue={additionalData[`${question.id}_additional`] as string}
                        onAdditionalChange={(value) => handleAdditionalChange(question.id, value)}
                        formData={formData}
                        medicalFiles={question.id === 'has_medical_documents' ? medicalFiles : undefined}
                        onFilesChange={question.id === 'has_medical_documents' ? handleFilesChange : undefined}
                        onRemoveFile={question.id === 'has_medical_documents' ? handleRemoveFile : undefined}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-8 pb-8">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary w-full py-4 text-lg"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Отправка...
              </span>
            ) : (
              'Отправить анкету'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Компонент вопроса (мемоизированный для производительности)
interface QuestionFieldProps {
  question: Question;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  error?: string;
  additionalValue?: string;
  onAdditionalChange?: (value: string) => void;
  formData: FormData;
  medicalFiles?: File[];
  onFilesChange?: (files: File[]) => void;
  onRemoveFile?: (index: number) => void;
}

const QuestionField = memo(function QuestionField({ 
  question, 
  value, 
  onChange, 
  error, 
  additionalValue,
  onAdditionalChange,
  formData,
  medicalFiles,
  onFilesChange,
  onRemoveFile,
}: QuestionFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  // Показывать загрузку файлов для вопроса о медицинских документах
  const showFileUpload = question.id === 'has_medical_documents' && value === 'yes';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onFilesChange) {
      onFilesChange(Array.from(files));
    }
    // Сбрасываем input чтобы можно было выбрать тот же файл снова
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Функция для удаления номера из label
  const getLabelWithoutNumber = (label: string): string => {
    // Удаляем паттерны типа "29. ", "1. " и т.д. в начале строки
    return label.replace(/^\d+\.\s*/, '');
  };

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

  // Форматирование размера файла
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-base font-medium text-medical-800">
          {getLabelWithoutNumber(question.label.ru)}
        </span>
        {question.required && <span className="text-red-500">*</span>}
      </div>

      {renderInput()}

      {/* Загрузка файлов для медицинских документов */}
      {showFileUpload && onFilesChange && onRemoveFile && (
        <div className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
          <p className="text-sm font-medium text-medical-700 mb-3">
            Загрузите ваши анализы и/или УЗИ (любые форматы):
          </p>
          
          {/* Список загруженных файлов */}
          {medicalFiles && medicalFiles.length > 0 && (
            <div className="space-y-2 mb-3">
              {medicalFiles.map((file, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-medical-200"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-5 h-5 text-primary-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm text-medical-700 truncate">{file.name}</span>
                    <span className="text-xs text-medical-500 flex-shrink-0">({formatFileSize(file.size)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveFile(index)}
                    className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Кнопка загрузки */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="*/*"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-primary-300 rounded-lg text-primary-700 hover:bg-primary-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добавить файл
          </button>
        </div>
      )}

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
});
