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
        <div key={op.assigned_operator} className="bg-white ring-1 ring-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-slate-900 font-semibold">{op.operator_name ?? op.assigned_operator}</h3>
            <div className="flex gap-3 text-xs text-slate-600">
              <span>{op.total_creators} Creators</span>
              <span className="text-emerald-700">{op.active_creators} active</span>
              {op.ambassadors > 0 && <span className="text-violet-700">{op.ambassadors} Ambassadors</span>}
            </div>
          </div>
          {/* Delivery bar */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-3 rounded-full overflow-hidden bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${
                  op.delivery_rate_this_week >= 80 ? 'bg-emerald-500' :
                  op.delivery_rate_this_week >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(op.delivery_rate_this_week, 100)}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-slate-900 w-12 text-right">{op.delivery_rate_this_week}%</span>
          </div>
          <div className="flex gap-4 text-xs text-slate-500">
            <span>Open: <span className="text-amber-700 font-semibold">{op.open_tasks_this_week}</span></span>
            <span>Delivered: <span className="text-emerald-700 font-semibold">{op.delivered_this_week}</span></span>
            <span>Total Sales: <span className="text-slate-900 font-semibold">{op.total_sales}</span></span>
            <span>Revenue: <span className="text-slate-900 font-semibold">&euro;{(op.total_revenue ?? 0).toFixed(0)}</span></span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CreatorOperatorsTab;
