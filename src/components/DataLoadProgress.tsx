import React from 'react';
import { CheckCircle, Circle, RefreshCw } from 'lucide-react';

interface ProgressStep {
  id: string;
  label: string;
  completed: boolean;
  current: boolean;
}

interface DataLoadProgressProps {
  isVisible: boolean;
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
  completed?: boolean;
  onClose?: () => void;
}

const DataLoadProgress: React.FC<DataLoadProgressProps> = ({
  isVisible,
  currentStep,
  totalSteps,
  stepLabel,
  completed = false,
  onClose
}) => {
  if (!isVisible) return null;

  const steps: ProgressStep[] = [
    { id: 'onboard', label: 'Registrando business', completed: completed || currentStep > 1, current: !completed && currentStep === 1 },
    { id: 'google', label: 'Google Reviews', completed: completed || currentStep > 2, current: !completed && currentStep === 2 },
    { id: 'tripadvisor', label: 'TripAdvisor Reviews', completed: completed || currentStep > 3, current: !completed && currentStep === 3 },
    { id: 'analysis', label: 'Análisis (solo tu negocio)', completed: completed || currentStep > 4, current: !completed && currentStep === 4 }
  ];

  const progress = completed ? 100 : Math.round((currentStep / totalSteps) * 100);
  const isCompleted = completed || currentStep >= totalSteps;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            {isCompleted ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isCompleted ? '¡Datos Cargados Exitosamente!' : 'Cargando Datos del Backend'}
          </h3>
          <p className="text-sm text-gray-600">
            {isCompleted ? 'Todos los datos han sido procesados correctamente' : stepLabel}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progreso</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                isCompleted ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3 mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {step.completed ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : step.current ? (
                  <div className="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                  </div>
                ) : (
                  <Circle className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <span className={`text-sm ${
                step.completed ? 'text-green-700 font-medium' :
                step.current ? 'text-blue-700 font-medium' :
                'text-gray-500'
              }`}>
                {step.label}
              </span>
              {step.current && !isCompleted && (
                <RefreshCw className="h-4 w-4 text-blue-500 animate-spin ml-auto" />
              )}
              {step.completed && (
                <span className="ml-auto text-xs text-green-600 font-medium">✓</span>
              )}
            </div>
          ))}
        </div>

        {/* Action Button */}
        {isCompleted && (
          <button
            onClick={onClose}
            className="w-full bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 transition-colors font-medium"
          >
            ¡Perfecto! Ver Dashboard
          </button>
        )}

        {/* Loading state info */}
        {!isCompleted && (
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Este proceso puede tomar unos segundos...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataLoadProgress;
