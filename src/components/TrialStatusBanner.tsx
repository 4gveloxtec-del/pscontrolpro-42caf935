import { useTrialApiStatus } from '@/hooks/useTrialApiStatus';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertTriangle, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function TrialStatusBanner() {
  const { 
    isInTrial,
    trialEndsAt,
    trialDaysRemaining,
    apiAllowedInTrial,
    apiHoursRemaining,
    apiBlocked,
    blockReason,
    isPermanent,
    hasPaidPlan,
    isLoading 
  } = useTrialApiStatus();

  if (isLoading) return null;

  // Paid users or permanent don't see this
  if (isPermanent || (hasPaidPlan && !isInTrial)) return null;

  // Format remaining hours
  const formatHoursRemaining = (hours: number) => {
    if (hours >= 1) {
      const h = Math.floor(hours);
      const m = Math.floor((hours - h) * 60);
      return m > 0 ? `${h}h ${m}min` : `${h}h`;
    }
    return `${Math.ceil(hours * 60)}min`;
  };

  return (
    <div className="space-y-2">
      {/* Trial Period Banner */}
      {isInTrial && trialEndsAt && (
        <Alert className="border-warning/50 bg-warning/10">
          <Clock className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm">
            <span className="font-medium">Teste grátis ativo</span>
            {' '}até {format(trialEndsAt, "dd/MM/yyyy", { locale: ptBR })}
            {trialDaysRemaining > 0 && (
              <span className="text-muted-foreground">
                {' '}({trialDaysRemaining} {trialDaysRemaining === 1 ? 'dia' : 'dias'} restantes)
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* API Status Banner */}
      {isInTrial && (
        <>
          {apiBlocked ? (
            <Alert className="border-destructive/50 bg-destructive/10">
              <Lock className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-sm">
                <span className="font-medium">WhatsApp API bloqueada</span>
                {blockReason && (
                  <p className="text-muted-foreground mt-0.5">{blockReason}</p>
                )}
              </AlertDescription>
            </Alert>
          ) : apiAllowedInTrial && apiHoursRemaining !== null ? (
            <Alert className={apiHoursRemaining <= 2 
              ? "border-warning/50 bg-warning/10" 
              : "border-success/50 bg-success/10"
            }>
              {apiHoursRemaining <= 2 ? (
                <AlertTriangle className="h-4 w-4 text-warning" />
              ) : (
                <Sparkles className="h-4 w-4 text-success" />
              )}
              <AlertDescription className="text-sm">
                <span className="font-medium">WhatsApp API disponível</span>
                <span className="text-muted-foreground">
                  {' '}por mais {formatHoursRemaining(apiHoursRemaining)}
                </span>
                {apiHoursRemaining <= 2 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ative seu plano para continuar usando após esse período
                  </p>
                )}
              </AlertDescription>
            </Alert>
          ) : !apiAllowedInTrial ? (
            <Alert className="border-muted bg-muted/50">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <AlertDescription className="text-sm">
                <span className="font-medium">WhatsApp API não disponível no teste</span>
                <p className="text-muted-foreground mt-0.5">
                  Ative o plano automático para usar a API WhatsApp
                </p>
              </AlertDescription>
            </Alert>
          ) : null}
        </>
      )}
    </div>
  );
}
