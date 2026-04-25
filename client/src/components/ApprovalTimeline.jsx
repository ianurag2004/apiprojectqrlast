import { CheckCircle, Clock, XCircle, Circle } from 'lucide-react';

const STEPS = [
  { key: 'hod', label: 'Head of Department', short: 'HOD' },
  { key: 'dean', label: 'Dean of Faculty', short: 'Dean' },
  { key: 'finance', label: 'Finance Department', short: 'Finance' },
];

const statusIcon = (status) => {
  if (status === 'approved') return <CheckCircle size={16} className="text-emerald-400" />;
  if (status === 'rejected') return <XCircle size={16} className="text-red-400" />;
  if (status === 'pending') return <Clock size={16} className="text-amber-400" />;
  return <Circle size={16} className="text-white/30" />;
};

const stepClass = (status) => {
  if (status === 'approved') return 'done';
  if (status === 'pending') return 'active';
  return 'waiting';
};

export default function ApprovalTimeline({ approvalChain = [], eventStatus }) {
  return (
    <div className="space-y-2">
      {/* Overall status */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-white/50">Status:</span>
        <span className={`badge badge-${
          eventStatus === 'approved' ? 'approved' :
          eventStatus === 'rejected' ? 'rejected' :
          eventStatus === 'draft' ? 'draft' : 'pending'
        }`}>
          {eventStatus?.replace('_', ' ').toUpperCase() || 'DRAFT'}
        </span>
      </div>

      {STEPS.map((step, i) => {
        const chainStep = approvalChain.find(s => s.role === step.key) || {};
        const status = chainStep.status || 'pending';
        return (
          <div key={step.key} className="relative">
            {i < STEPS.length - 1 && (
              <div className="absolute left-[22px] top-10 w-px h-2 bg-white/10" />
            )}
            <div className={`approval-step ${stepClass(status)}`}>
              <div className="flex-shrink-0">{statusIcon(status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-white">{step.label}</span>
                  <span className={`badge text-[10px] ${
                    status === 'approved' ? 'badge-approved' :
                    status === 'rejected' ? 'badge-rejected' : 'badge-pending'
                  }`}>{status.toUpperCase()}</span>
                </div>
                {chainStep.comment && (
                  <p className="text-xs text-white/50 mt-1 truncate">"{chainStep.comment}"</p>
                )}
                {chainStep.timestamp && (
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {new Date(chainStep.timestamp).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
