-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to auto-update invoice status based on payments
create or replace function update_invoice_status()
returns trigger as $$
declare
  invoice_total numeric(10,2);
  invoice_paid numeric(10,2);
begin
  select total, paid_amount into invoice_total, invoice_paid
  from invoices where id = new.invoice_id;
  
  if invoice_paid >= invoice_total then
    update invoices set status = 'paid' where id = new.invoice_id;
  elsif invoice_paid > 0 then
    update invoices set status = 'partial' where id = new.invoice_id;
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger on_payment_added
  after insert on payments
  for each row execute function update_invoice_status();

-- Function to update invoice paid_amount and balance when payment is added
create or replace function update_invoice_payment()
returns trigger as $$
begin
  update invoices
  set paid_amount = (
    select coalesce(sum(amount), 0)
    from payments
    where invoice_id = new.invoice_id
  ),
  balance = total - (
    select coalesce(sum(amount), 0)
    from payments
    where invoice_id = new.invoice_id
  )
  where id = new.invoice_id;
  
  return new;
end;
$$ language plpgsql;

create trigger on_payment_inserted
  after insert on payments
  for each row execute function update_invoice_payment();

create trigger on_payment_deleted
  after delete on payments
  for each row execute function update_invoice_payment();
