
import React from 'react';

interface Props {
  message: string;
  onDismiss: () => void;
}

const ErrorModal: React.FC<Props> = ({ message, onDismiss }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-md w-full bg-red-900 border border-red-700 rounded-2xl p-8 shadow-2xl text-center">
        <div className="text-5xl mb-4 animate-bounce">🚨</div>
        <h3 className="text-xl font-bold text-white mb-3">Simulation Error</h3>
        <p className="text-red-100 text-sm mb-6 leading-relaxed">
          {message}
        </p>
        <button
          onClick={onDismiss}
          className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default ErrorModal;
