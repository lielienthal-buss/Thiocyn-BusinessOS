import React from 'react';
import FellowCourseView from './FellowCourseView';
import AdminAcademyView from './AdminAcademyView';

interface AcademyViewProps {
  /** Effective role of the viewer — determines surface mode. */
  role: 'owner' | 'admin' | 'staff' | 'intern_lead' | 'fellow' | 'viewer';
}

/**
 * Academy dispatcher.
 *
 * - Fellow (role='fellow'): renders their personal course surface (goals, tasks,
 *   learning log, phase journey). RLS restricts all queries to their own intern_id.
 *
 * - Admin+ (owner/admin/staff/intern_lead): renders the cohort management view.
 *   From there, admins can drill into an individual fellow's course surface
 *   via FellowCourseView with `showEvalLayer` enabled (phase promotion, notes).
 */
const AcademyView: React.FC<AcademyViewProps> = ({ role }) => {
  if (role === 'fellow') {
    return <FellowCourseView />;
  }
  return <AdminAcademyView />;
};

export default AcademyView;
