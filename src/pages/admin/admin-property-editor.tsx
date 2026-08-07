import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getAdminSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { ListPropertyWizard } from '../portal/list-property';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../../components/ui';

export function AdminPropertyEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguageContext();
  const adminSections = getAdminSections(t);

  React.useEffect(() => {
    // If the URL doesn't have the draft_id param, we should append it so ListPropertyWizard loads it
    const params = new URLSearchParams(window.location.search);
    if (!params.get('draft_id') && id) {
      params.set('draft_id', id);
      navigate(`/admin/properties/edit/${id}?${params.toString()}`, { replace: true });
    }
  }, [id, navigate]);

  return (
    <DashboardLayout sections={adminSections} title="Edit Property">
      <div className="mb-4">
        <Button 
          variant="ghost" 
          icon={<ChevronLeft className="h-4 w-4" />} 
          onClick={() => navigate('/admin/properties')}
        >
          Back to Properties
        </Button>
      </div>
      <div className="bg-white rounded-3xl shadow-sm border border-navy-100 min-h-[80vh] overflow-hidden relative z-0">
        <div className="absolute inset-0 overflow-y-auto">
          <ListPropertyWizard isAdminMode={true} disableLayout={true} />
        </div>
      </div>
    </DashboardLayout>
  );
}
