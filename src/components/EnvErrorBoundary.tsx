/**
 * Environment Error Boundary
 * 
 * Displays a user-friendly error message when environment variables
 * are missing or misconfigured, instead of a blank/broken page.
 */
import { useEffect, useState } from 'react';
import { validateEnv } from '@/lib/env';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';

interface EnvErrorBoundaryProps {
  children: React.ReactNode;
}

export function EnvErrorBoundary({ children }: EnvErrorBoundaryProps) {
  const [envErrors, setEnvErrors] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const { valid, errors } = validateEnv();
    if (!valid) {
      setEnvErrors(errors);
    }
    setChecked(true);
  }, []);

  // Still validating
  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Environment errors detected
  if (envErrors.length > 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-xl space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold text-white">
              Erro de Configuração
            </h1>
            <p className="text-gray-400 text-sm">
              O aplicativo não pôde iniciar porque faltam variáveis de ambiente obrigatórias.
            </p>
          </div>

          {/* Error List */}
          <div className="bg-gray-900/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-gray-300 mb-3">
              Problemas encontrados:
            </p>
            {envErrors.map((error, index) => (
              <div 
                key={index}
                className="flex items-start gap-2 text-sm text-red-400"
              >
                <span className="text-red-500 mt-0.5">•</span>
                <span>{error}</span>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div className="space-y-3 text-sm text-gray-400">
            <p className="font-medium text-gray-300">Como resolver:</p>
            
            <div className="space-y-2">
              <p className="flex items-start gap-2">
                <span className="text-gray-500 font-mono">1.</span>
                Acesse as configurações do seu projeto na Vercel
              </p>
              <p className="flex items-start gap-2">
                <span className="text-gray-500 font-mono">2.</span>
                Vá em Settings → Environment Variables
              </p>
              <p className="flex items-start gap-2">
                <span className="text-gray-500 font-mono">3.</span>
                Adicione as variáveis que estão faltando
              </p>
              <p className="flex items-start gap-2">
                <span className="text-gray-500 font-mono">4.</span>
                Faça um novo deploy do projeto
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar Novamente
            </button>
            
            <a
              href="https://vercel.com/docs/environment-variables"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-gray-200 rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Ver Documentação
            </a>
          </div>

          {/* Technical Info */}
          <div className="pt-2 border-t border-gray-700">
            <p className="text-xs text-gray-500 text-center">
              Ambiente: {import.meta.env.MODE} | 
              Host: {typeof window !== 'undefined' ? window.location.hostname : 'unknown'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // All good, render children
  return <>{children}</>;
}
