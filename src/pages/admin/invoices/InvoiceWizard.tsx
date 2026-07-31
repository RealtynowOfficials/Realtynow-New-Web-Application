import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../../../lib/supabase';
import { Plus, Trash2 } from 'lucide-react';
import { Spinner } from '../../../components/ui';

// Schema
const invoiceItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  quantity: z.number().min(1),
  unit_price: z.number().min(0),
  total: z.number().min(0)
});

const invoiceSchema = z.object({
  customer_id: z.string().uuid('Please select a customer'),
  property_id: z.string().uuid().optional().or(z.literal('')),
  agent_id: z.string().uuid().optional().or(z.literal('')),
  due_date: z.string().min(1, 'Due Date is required'),
  tax_percentage: z.number().min(0).max(100),
  discount: z.number().min(0),
  items: z.array(invoiceItemSchema).min(1, 'Add at least one item'),
  notes: z.string().optional()
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export default function InvoiceWizard({ onCancel }: { onCancel: () => void }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      tax_percentage: 18,
      discount: 0,
      items: [{ title: '', quantity: 1, unit_price: 0, total: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchItems = watch('items');
  const watchTaxPct = watch('tax_percentage');
  const watchDiscount = watch('discount');

  // Auto-calculation
  const subtotal = watchItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const taxAmount = (subtotal * (watchTaxPct || 0)) / 100;
  const totalAmount = subtotal + taxAmount - (watchDiscount || 0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // We fetch profiles where role=customer, as the schema might map customers to profiles for simplicity
    // But we created txn_customers! We should fetch from txn_customers.
    const [{ data: cData }, { data: pData }] = await Promise.all([
      supabase.from('txn_customers').select('*').order('name'),
      supabase.from('properties').select('id, title, price').eq('status', 'published')
    ]);
    setCustomers(cData || []);
    setProperties(pData || []);
  };

  // Watch for row total updates
  useEffect(() => {
    watchItems.forEach((item, index) => {
      const rowTotal = item.quantity * item.unit_price;
      if (item.total !== rowTotal) {
        setValue(`items.${index}.total`, rowTotal);
      }
    });
  }, [watchItems, setValue]);

  const onSubmit = async (data: InvoiceFormValues) => {
    setIsSubmitting(true);
    try {
      // 1. Insert invoice
      const { data: invData, error: invErr } = await supabase.from('txn_invoices').insert({
        customer_id: data.customer_id,
        property_id: data.property_id || null,
        agent_id: data.agent_id || null,
        due_date: data.due_date,
        subtotal,
        tax_percentage: data.tax_percentage,
        tax_amount: taxAmount,
        discount: data.discount,
        total_amount: totalAmount,
        notes: data.notes,
        invoice_status: 'issued'
      }).select('id').single();

      if (invErr) throw invErr;

      // 2. Insert items
      const itemsToInsert = data.items.map(item => ({
        ...item,
        invoice_id: invData.id
      }));

      const { error: itemsErr } = await supabase.from('txn_invoice_items').insert(itemsToInsert);
      if (itemsErr) throw itemsErr;

      alert('Invoice Generated Successfully!');
      onCancel();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Create New Invoice</h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">Cancel</button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Customer</label>
            <select {...register('customer_id')} className="w-full border rounded-md p-2">
              <option value="">Select Customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
            </select>
            {errors.customer_id && <p className="text-red-500 text-xs mt-1">{errors.customer_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Property (Optional)</label>
            <select {...register('property_id')} className="w-full border rounded-md p-2">
              <option value="">Select Property</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input type="date" {...register('due_date')} className="w-full border rounded-md p-2" />
            {errors.due_date && <p className="text-red-500 text-xs mt-1">{errors.due_date.message}</p>}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-700">Invoice Items</h3>
            <button
              type="button"
              onClick={() => append({ title: '', quantity: 1, unit_price: 0, total: 0 })}
              className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-md flex items-center gap-1 hover:bg-blue-100"
            >
              <Plus className="w-4 h-4" /> Add Row
            </button>
          </div>

          <div className="overflow-x-auto border rounded-md">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 border-b">
                <tr>
                  <th className="p-3">Description</th>
                  <th className="p-3 w-24">Qty</th>
                  <th className="p-3 w-32">Unit Price</th>
                  <th className="p-3 w-32">Total</th>
                  <th className="p-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={field.id} className="border-b last:border-0">
                    <td className="p-2">
                      <input 
                        {...register(`items.${index}.title` as const)} 
                        className="w-full p-1 border rounded" 
                        placeholder="Item name"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        {...register(`items.${index}.quantity` as const, { valueAsNumber: true })} 
                        className="w-full p-1 border rounded text-right" 
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        {...register(`items.${index}.unit_price` as const, { valueAsNumber: true })} 
                        className="w-full p-1 border rounded text-right" 
                      />
                    </td>
                    <td className="p-2 text-right font-medium">
                      ₹{watchItems[index]?.total?.toLocaleString() || 0}
                    </td>
                    <td className="p-2 text-center">
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(index)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">₹{subtotal.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Tax (%)</span>
              <input 
                type="number" 
                {...register('tax_percentage', { valueAsNumber: true })} 
                className="w-20 p-1 border rounded text-right" 
              />
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax Amount:</span>
              <span className="font-medium">₹{taxAmount.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Discount (₹)</span>
              <input 
                type="number" 
                {...register('discount', { valueAsNumber: true })} 
                className="w-24 p-1 border rounded text-right" 
              />
            </div>

            <div className="pt-3 border-t flex justify-between font-bold text-lg">
              <span>Grand Total:</span>
              <span>₹{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded-md font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting && <Spinner className="w-4 h-4" />}
            Generate Invoice
          </button>
        </div>
      </form>
    </div>
  );
}
