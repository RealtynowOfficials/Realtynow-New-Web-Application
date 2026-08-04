import React, { useState } from 'react';
import { formatPrice } from '../../lib/utils';
import { useLanguageContext } from '../../lib/i18n/language-context';

export function EMICalculatorPage() {
  const { t } = useLanguageContext();
  const [amount, setAmount] = useState(5000000);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);

  const monthlyRate = rate / 12 / 100;
  const months = years * 12;
  const emi =
    monthlyRate > 0
      ? (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
      : amount / months;
  const total = emi * months;
  const interest = total - amount;

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <div className="container-wide">
        <div className="mx-auto max-w-xl">
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl font-extrabold text-navy-900 sm:text-4xl">
              {t('home.emiCalculatorTitle', 'Home Loan EMI Calculator')}
            </h1>
            <p className="mt-2 text-sm text-navy-500">
              {t('home.emiSubtitle', 'Plan your finances with our smart calculator')}
            </p>
          </div>

          <div className="card-premium p-6 space-y-5">
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-navy-700">{t('home.loanAmount', 'Loan Amount')}</span>
                  <span className="font-bold text-primary-600">{formatPrice(amount)}</span>
                </div>
                <input
                  type="range"
                  min="500000"
                  max="50000000"
                  step="100000"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full accent-primary-600"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-navy-700">{t('home.interestRate', 'Interest Rate')}</span>
                  <span className="font-bold text-primary-600">{rate}%</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="15"
                  step="0.1"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="w-full accent-primary-600"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-navy-700">{t('home.tenure', 'Tenure')}</span>
                  <span className="font-bold text-primary-600">
                    {years} {t('home.years', 'years')}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="w-full accent-primary-600"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 p-6 text-white">
              <p className="text-sm text-white/70">{t('home.monthlyEmi', 'Your Monthly EMI')}</p>
              <p className="mt-1 font-display text-4xl font-extrabold tracking-tight">{formatPrice(emi)}</p>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/20 pt-5">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/60">
                    {t('home.principal', 'Principal')}
                  </p>
                  <p className="mt-1 font-bold text-base">{formatPrice(amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/60">
                    {t('home.totalInterest', 'Total Interest')}
                  </p>
                  <p className="mt-1 font-bold text-base">{formatPrice(interest)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/60">
                    {t('home.totalPayable', 'Total Payable')}
                  </p>
                  <p className="mt-1 font-bold text-base">{formatPrice(total)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
