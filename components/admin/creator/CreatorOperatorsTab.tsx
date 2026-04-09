import React from 'react';
import { OperatorDashboard } from './types';

interface Props {
  operators: OperatorDashboard[];
  loading: boolean;
}

const CreatorOperatorsTab: React.FC<Props> = ({ operators, loading }) => {
  if (loading) {
    return <div className="flex justify-center py-20 text-slate-500 text-sm">Loading operator data...</div>;
  }

  if (operators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <span className="text-4xl mb-3">&#x1F464;</span>
        <p className="text-sm font-medium">No operators assigned. Assign an operator to creators via the assigned_operator field.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {operators.map(op => (
        <div key={op.assigned_operator} className="bg-surface-800/60 border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold">{op.operator_name ?? op.assigned_operator}</h3>
            <div className="flex gap-3 text-xs text-slate-400">
              <span>{op.total_creators} Creators</span>
              <span className="text-green-400">{op.active_creators} active</span>
              {op.ambassadors > 0 && <span className="text-violet-400">{op.ambassadors} Ambassadors</span>}
            </div>
          </div>
          {/* Delivery bar */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-3 rounded-full overflow-hidden bg-surface-900/60">
              <div
                className={`h-full rounded-full transition-all ${
                  op.delivery_rate_this_week >= 80 ? 'bg-green-500' :
                  op.delivery_rate_this_week >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(op.delivery_rate_this_week, 100)}%` }}
              />
            </div>
            <span className="text-sm font-bold text-white w-12 text-right">{op.delivery_rate_this_week}%</span>
          </div>
          <div className="flex gap-4 text-xs text-slate-500">
            <span>Open: <span className="text-amber-400 font-bold">{op.open_tasks_this_week}</span></span>
            <span>Delivered: <span className="text-green-400 font-bold">{op.delivered_this_week}</span></span>
            <span>Total Sales: <span className="text-white font-bold">{op.total_sales}</span></span>
            <span>Revenue: <span className="text-white font-bold">&euro;{(op.total_revenue ?? 0).toFixed(0)}</span></span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CreatorOperatorsTab;
