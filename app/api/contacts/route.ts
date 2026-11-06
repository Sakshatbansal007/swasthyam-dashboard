import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabase';
import fs from 'fs/promises';
import path from 'path';
import { MasterContact, CONTACT_CATEGORIES } from '@/lib/contactTypes';

// Cache in memory for lightning fast loads
let cachedContacts: MasterContact[] | null = null;

async function loadBundledContacts(): Promise<MasterContact[]> {
  if (cachedContacts && cachedContacts.length > 0) {
    return cachedContacts;
  }
  try {
    const filePath = path.join(process.cwd(), 'public', 'master_contacts.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    cachedContacts = JSON.parse(fileContent);
    return cachedContacts || [];
  } catch (err) {
    console.error('Failed to read bundled master_contacts.json:', err);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const district = searchParams.get('district');
    const state = searchParams.get('state');
    const all = searchParams.get('all') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Try fetching from Supabase first if available
    let source: 'supabase' | 'bundled' = 'bundled';
    let allContacts: MasterContact[] = [];

    try {
      const dbContacts: MasterContact[] = [];
      const chunkSize = 1000;
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from('master_contacts')
          .select('*')
          .order('id', { ascending: true })
          .range(from, from + chunkSize - 1);

        if (error || !data || data.length === 0) break;
        dbContacts.push(...(data as MasterContact[]));
        if (data.length < chunkSize) break;
        from += chunkSize;
      }

      if (dbContacts.length > 0) {
        const bundled = await loadBundledContacts();
        const dbMap = new Map(dbContacts.map((c) => [c.id, c]));
        const merged = bundled.length > 0
          ? bundled.map((c) => dbMap.get(c.id) || c)
          : dbContacts;

        for (const dbC of dbContacts) {
          if (dbC.id > 5599) merged.push(dbC);
        }
        allContacts = merged;
        source = 'supabase';
      } else {
        allContacts = await loadBundledContacts();
      }
    } catch {
      allContacts = await loadBundledContacts();
    }

    // Calculate category breakdown
    const categoryCounts: Record<string, number> = {
      'All': allContacts.length,
    };
    for (const cat of CONTACT_CATEGORIES) {
      categoryCounts[cat] = 0;
    }
    for (const c of allContacts) {
      if (categoryCounts[c.category] !== undefined) {
        categoryCounts[c.category]++;
      } else {
        categoryCounts['Others (Friends, Personal & Unsorted)'] = 
          (categoryCounts['Others (Friends, Personal & Unsorted)'] || 0) + 1;
      }
    }

    // Apply filtering
    let filtered = allContacts;

    if (category && category !== 'All') {
      filtered = filtered.filter((c) => c.category === category);
    }

    if (district && district !== 'All') {
      filtered = filtered.filter((c) => c.district.toLowerCase() === district.toLowerCase());
    }

    if (state && state !== 'All') {
      filtered = filtered.filter((c) => c.state.toLowerCase() === state.toLowerCase());
    }

    if (search) {
      filtered = filtered.filter((c) => {
        return (
          c.name.toLowerCase().includes(search) ||
          c.phone.toLowerCase().includes(search) ||
          (c.area && c.area.toLowerCase().includes(search)) ||
          c.district.toLowerCase().includes(search) ||
          c.state.toLowerCase().includes(search) ||
          c.business.toLowerCase().includes(search) ||
          c.birthday.toLowerCase().includes(search) ||
          (c.notes && c.notes.toLowerCase().includes(search))
        );
      });
    }

    const total = filtered.length;

    // If client requested all records (for instant client-side manipulation)
    if (all) {
      return NextResponse.json({
        success: true,
        source,
        total,
        contacts: filtered,
        categoryCounts,
      });
    }

    // Otherwise paginate
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      source,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      contacts: paginated,
      categoryCounts,
    });
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, district, state, area, business, birthday, category, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    const bundled = await loadBundledContacts();
    const maxId = bundled.reduce((max, c) => (c.id > max ? c.id : max), 5599);
    const newId = maxId + 1;

    const newContact: MasterContact = {
      id: newId,
      name: name.trim(),
      phone: (phone || '').trim(),
      district: (district || '').trim(),
      state: (state || '').trim(),
      area: (area || '').trim(),
      business: (business || '').trim(),
      birthday: (birthday || '').trim(),
      category: category || 'Others (Friends, Personal & Unsorted)',
      notes: (notes || '').trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Try saving to Supabase
    try {
      const { error: insertError } = await supabase.from('master_contacts').insert([newContact]);
      if (insertError && insertError.message.includes('area')) {
        const { area: _a, ...withoutArea } = newContact;
        await supabase.from('master_contacts').insert([withoutArea]);
      }
    } catch (e) {
      console.warn('Could not insert into Supabase directly:', e);
    }

    // Update in-memory cache
    if (cachedContacts) {
      cachedContacts.push(newContact);
    }

    return NextResponse.json({ success: true, contact: newContact });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create contact' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, phone, district, state, area, business, birthday, category, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Contact ID is required' }, { status: 400 });
    }

    const updatePayload: Partial<MasterContact> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updatePayload.name = name.trim();
    if (phone !== undefined) updatePayload.phone = phone.trim();
    if (district !== undefined) updatePayload.district = district.trim();
    if (state !== undefined) updatePayload.state = state.trim();
    if (area !== undefined) updatePayload.area = area.trim();
    if (business !== undefined) updatePayload.business = business.trim();
    if (birthday !== undefined) updatePayload.birthday = birthday.trim();
    if (category !== undefined) updatePayload.category = category.trim();
    if (notes !== undefined) updatePayload.notes = notes.trim();

    // Update Supabase
    let supabaseUpdated = false;
    try {
      const { error } = await supabase
        .from('master_contacts')
        .update(updatePayload)
        .eq('id', id);
      if (!error) {
        supabaseUpdated = true;
      } else if (error.message.includes('area')) {
        const { area: _a, ...withoutArea } = updatePayload;
        const retryResult = await supabase
          .from('master_contacts')
          .update(withoutArea)
          .eq('id', id);
        if (!retryResult.error) supabaseUpdated = true;
      }
    } catch (e) {
      console.warn('Could not update Supabase directly:', e);
    }

    // Update in-memory cache
    if (cachedContacts) {
      const idx = cachedContacts.findIndex((c) => c.id === id);
      if (idx !== -1) {
        cachedContacts[idx] = { ...cachedContacts[idx], ...updatePayload };
      }
    }

    return NextResponse.json({
      success: true,
      supabaseUpdated,
      updated: { id, ...updatePayload },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update contact' },
      { status: 500 }
    );
  }
}

