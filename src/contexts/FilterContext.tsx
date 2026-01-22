import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Filters {
  class: string | null; // "Class 6" to "Class 12" or "Competitive Exams (JEE/NEET)"
  subject: string | null;
  board: 'CBSE' | 'ICSE' | 'State Board' | 'IB' | 'IGCSE' | null;
  language: string | null; // e.g., "English", "Hindi", "Tamil"
  videoType: 'Animated' | 'Whiteboard' | 'Teacher-led' | 'Revision' | 'Detailed Lecture' | null;
  videoDuration: 'Short (5-10 min)' | 'Medium (15-30 min)' | 'Long (45+ min)' | null;
  quizType: 'Adaptive Timed' | 'Normal' | null;
}

interface FilterContextType {
  filters: Filters;
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;
  isFilterValid: () => boolean;
  validateFilterCombination: () => { valid: boolean; message?: string };
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};

interface FilterProviderProps {
  children: ReactNode;
}

const SUBJECTS_BY_CLASS: Record<string, string[]> = {
  'Class 6': ['Mathematics', 'Science', 'Social Studies', 'English', 'Hindi'],
  'Class 7': ['Mathematics', 'Science', 'Social Studies', 'English', 'Hindi'],
  'Class 8': ['Mathematics', 'Science', 'Social Studies', 'English', 'Hindi'],
  'Class 9': ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies'],
  'Class 10': ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies'],
  'Class 11': ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English'],
  'Class 12': ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English'],
  'Competitive Exams (JEE/NEET)': [
    'Physics',
    'Chemistry',
    'Biology',
    'Mathematics',
    'Organic Chemistry',
    'Inorganic Chemistry',
    'Physical Chemistry',
  ],
};

const BOARDS = ['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE'] as const;
const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Marathi', 'Gujarati'];
const VIDEO_TYPES = ['Animated', 'Whiteboard', 'Teacher-led', 'Revision', 'Detailed Lecture'] as const;
const DURATIONS = ['Short (5-10 min)', 'Medium (15-30 min)', 'Long (45+ min)'] as const;
const QUIZ_TYPES = ['Adaptive Timed', 'Normal'] as const;

export const FilterProvider: React.FC<FilterProviderProps> = ({ children }) => {
  const [filters, setFiltersState] = useState<Filters>({
    class: null,
    subject: null,
    board: null,
    language: 'English',
    videoType: null,
    videoDuration: null,
    quizType: 'Normal',
  });

  const validateFilterCombination = (): { valid: boolean; message?: string } => {
    // If class is selected, subject must be valid for that class
    if (filters.class && filters.subject) {
      const validSubjects = SUBJECTS_BY_CLASS[filters.class] || [];
      if (!validSubjects.includes(filters.subject)) {
        return {
          valid: false,
          message: `"${filters.subject}" is not available for ${filters.class}. Please select a valid subject.`,
        };
      }
    }

    // Ensure language is selected
    if (!filters.language) {
      return {
        valid: false,
        message: 'Please select a language for content generation.',
      };
    }

    return { valid: true };
  };

  const isFilterValid = (): boolean => {
    return validateFilterCombination().valid;
  };

  const setFilters = (newFilters: Partial<Filters>) => {
    setFiltersState((prev) => {
      const updated = { ...prev, ...newFilters };

      // If class changes, reset subject (as it's class-specific)
      if (newFilters.class && newFilters.class !== prev.class) {
        updated.subject = null;
      }

      return updated;
    });
  };

  const resetFilters = () => {
    setFiltersState({
      class: null,
      subject: null,
      board: null,
      language: 'English',
      videoType: null,
      videoDuration: null,
      quizType: 'Normal',
    });
  };

  return (
    <FilterContext.Provider
      value={{
        filters,
        setFilters,
        resetFilters,
        isFilterValid,
        validateFilterCombination,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

// Helper exports for UI components
export const FILTER_OPTIONS = {
  classes: ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'Competitive Exams (JEE/NEET)'],
  subjects: SUBJECTS_BY_CLASS,
  boards: BOARDS,
  languages: LANGUAGES,
  videoTypes: VIDEO_TYPES,
  durations: DURATIONS,
  quizTypes: QUIZ_TYPES,
};
