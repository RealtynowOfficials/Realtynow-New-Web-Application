import { useState } from 'react';
import { PieChart, Phone, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { Card, EmptyState, Button, Input, Textarea } from '../../components/ui';

export function HomeLoansPage() {
  const { t } = useLanguageContext();
  const [form, setForm] = useState({ name: '', email: '', phone: '', loanAmount: '', message: '' });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from('enquiries').insert({
      name: form.name,
      email: form.email,
      phone: form.phone,
      property_id: null,
      tags: ['home-loan'],
      message: `Home Loan enquiry — Loan amount required: ${form.loanAmount || 'N/A'}. ${form.message}`,
    });
    setSubmitting(false);
    if (!error) setSent(true);
  };

  return (
    <div className="container-page py-12">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
          <PieChart className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-navy-900">{t('homeLoans.title', 'Home Loans')}</h1>
          <p className="mt-1 text-navy-600">
            {t('homeLoans.subtitle', 'Easy home loans with lowest interest rates — share your details to get started.')}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card className="p-6">
          {sent ? (
            <EmptyState
              title={t('homeLoans.sentTitle', 'Request received!')}
              description={t('homeLoans.sentDesc', 'Our home loan team will contact you within 24 hours.')}
            />
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Input
                label={t('contact.name', 'Name')}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
              <Input
                label={t('contact.email', 'Email')}
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
              <Input
                label={t('contact.phone', 'Phone')}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                required
              />
              <Input
                label={t('homeLoans.loanAmount', 'Loan Amount Required')}
                type="number"
                value={form.loanAmount}
                onChange={(e) => setForm((f) => ({ ...f, loanAmount: e.target.value }))}
                placeholder={t('homeLoans.loanAmountPlaceholder', 'e.g. 5000000')}
              />
              <Textarea
                label={t('homeLoans.notes', 'Anything else we should know?')}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder={t('homeLoans.notesPlaceholder', 'Employment type, existing loans, preferred bank...')}
              />
              <Button type="submit" loading={submitting}>
                {t('homeLoans.checkEligibility', 'Check Eligibility')}
              </Button>
            </form>
          )}
        </Card>

        <Card className="p-6 h-fit">
          <h2 className="font-display font-semibold text-navy-900">{t('contact.detailsHeader', 'Contact Details')}</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-red-600" /> <span className="text-navy-700">+91 94942 30774</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-red-600" /> <span className="text-navy-700">info@realtynow.in</span>
            </div>
          </div>
          <ul className="mt-5 space-y-2 text-sm text-navy-600">
            <li>• {t('homeLoans.point1', 'Rates starting from 8.35%')}</li>
            <li>• {t('homeLoans.point2', 'Minimal documentation')}</li>
            <li>• {t('homeLoans.point3', 'Top bank partners')}</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
