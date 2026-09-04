// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReceiptEditor } from './ReceiptEditor';
import type { Receipt } from '../types';

afterEach(cleanup);
const receipt: Receipt = { id: 'ticket', store: 'Consum', date: '2026-09-03', total: 1, createdAt: '2026-09-03', lines: [{ id: 'line', name: 'G.ANIMALS MILKA99,5', category: 'Mascotas', quantity: 1, unit: 'ud', unitPrice: 1, total: 1, confidence: 0.8 }] };
describe('saved ticket editing', () => {
  it('saves a category correction without mutating the original or changing amounts', () => {
    const save = vi.fn();
    render(<ReceiptEditor receipt={receipt} onSave={save} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Alimentación' } });
    expect(receipt.lines[0].category).toBe('Mascotas');
    fireEvent.click(screen.getByText('Guardar cambios'));
    expect(save).toHaveBeenCalledWith({ ...receipt, lines: [{ ...receipt.lines[0], category: 'Alimentación' }] });
  });
  it('cancels without saving', () => {
    const save = vi.fn(); const cancel = vi.fn();
    render(<ReceiptEditor receipt={receipt} onSave={save} onCancel={cancel} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Alimentación' } });
    fireEvent.click(screen.getByText('Cancelar'));
    expect(cancel).toHaveBeenCalledOnce();
    expect(save).not.toHaveBeenCalled();
    expect(receipt.lines[0].category).toBe('Mascotas');
  });
  it('disables saving an empty quantity', () => {
    render(<ReceiptEditor receipt={receipt} onSave={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '' } });
    expect((screen.getByText('Guardar cambios') as HTMLButtonElement).disabled).toBe(true);
  });
});
