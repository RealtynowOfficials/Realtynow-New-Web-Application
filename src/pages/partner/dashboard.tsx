import { useQuery } from '@tanstack/react-query';
import { Award, Building2, Mail, Phone, ShieldCheck, Wallet } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getPartnerSections } from '../portal/sections';
import { Card, Badge, Skeleton } from '../../components/ui';
import { formatDate } from '../../lib/utils';

interface PartnerRecord {
  id: string;
  partner_code: string | null;
  full_name: string;
  mobile_number: string;
  email: string | null;
  partner_type: string | null;
  company_name: string | null;
  status: string;
  verification_status: string | null;
  approved_at: string | null;
  created_at: string;
}

export function PartnerDashboard() {
  const { t } = useLanguageContext();
  const sections = getPartnerSections(t);
  const { user, profile } = useAuth();

  const { data: partner, isLoading } = useQuery({
    queryKey: ['partner-me', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('partners').select('*').eq('user_id', user.id).maybeSingle();
      return data as PartnerRecord | null;
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout sections={sections} title={t('dashboard:dashboard', 'Dashboard')}>
      <PageHeader
        title={`${t('dashboard.welcomeComma', 'Welcome,')} ${partner?.full_name ?? profile?.first_name ?? t('dashboard.partnerFallback', 'Partner')}`}
        subtitle={partner?.partner_code ? `${t('dashboard.partnerCodeLabel', 'Partner Code:')} ${partner.partner_code}` : t('dashboard.realtyNowPartner', 'RealtyNow Partner')}
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t('dashboard.accountStatus', 'Account Status')}
            value={partner?.status === 'active' ? t('dashboard.active', 'Active') : partner?.status ?? '—'}
            icon={<ShieldCheck className="h-5 w-5" />}
            accent={partner?.status === 'active' ? 'success' : 'error'}
          />
          <StatCard
            label={t('dashboard.verification', 'Verification')}
            value={partner?.verification_status ?? t('dashboard.pending', 'Pending')}
            icon={<Award className="h-5 w-5" />}
            accent="gold"
          />
          <StatCard label={t('dashboard.partnerTypeLabel', 'Partner Type')} value={partner?.partner_type ?? '—'} icon={<Building2 className="h-5 w-5" />} />
          <StatCard
            label={t('dashboard.partnerSince', 'Partner Since')}
            value={partner?.approved_at ? formatDate(partner.approved_at) : '—'}
            icon={<Wallet className="h-5 w-5" />}
          />
        </div>
      )}

      <Card className="mt-6 p-6">
        <h3 className="font-display text-lg font-bold text-navy-900 mb-4">{t('dashboard.myProfile', 'My Profile')}</h3>
        {partner ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100/50">
              <p className="text-xs text-navy-400 flex items-center gap-1.5 mb-1">
                <Phone className="h-3.5 w-3.5" /> {t('dashboard.mobileNumber', 'Mobile Number')}
              </p>
              <p className="text-sm font-medium text-navy-900">{partner.mobile_number}</p>
            </div>
            {partner.email && (
              <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100/50">
                <p className="text-xs text-navy-400 flex items-center gap-1.5 mb-1">
                  <Mail className="h-3.5 w-3.5" /> {t('dashboard.email', 'Email')}
                </p>
                <p className="text-sm font-medium text-navy-900">{partner.email}</p>
              </div>
            )}
            {partner.company_name && (
              <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100/50">
                <p className="text-xs text-navy-400 flex items-center gap-1.5 mb-1">
                  <Building2 className="h-3.5 w-3.5" /> {t('dashboard.company', 'Company')}
                </p>
                <p className="text-sm font-medium text-navy-900">{partner.company_name}</p>
              </div>
            )}
            <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100/50">
              <p className="text-xs text-navy-400 mb-1">{t('dashboard.status', 'Status')}</p>
              <Badge variant={partner.status === 'active' ? 'success' : 'error'}>{partner.status}</Badge>
            </div>
          </div>
        ) : (
          <p className="text-sm text-navy-500">{t('dashboard.partnerProfileLoadFailed', 'Your partner profile could not be loaded.')}</p>
        )}
      </Card>
    </DashboardLayout>
  );
}
