import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabase';
import fs from 'fs/promises';
import path from 'path';
import { MasterContact } from '@/lib/contactTypes';

export async function POST(request: NextRequest) {
  try {
    const { batchSize = 250, startIdx = 0 } = await request.json().catch(() => ({}));

    const filePath = path.join(process.cwd(), 'public', 'master_contacts.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const allContacts: MasterContact[] = JSON.parse(fileContent);

    const chunk = allContacts.slice(startIdx, startIdx + batchSize);

    if (chunk.length === 0) {
      return NextResponse.json({
        success: true,
        done: true,
        message: 'All contacts synced successfully',
        syncedCount: allContacts.length,
      });
    }

    const { error } = await supabase.from('master_contacts').upsert(chunk, { onConflict: 'id' });

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        hint: 'Please ensure table master_contacts has been created in your Supabase SQL editor.',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      done: startIdx + chunk.length >= allContacts.length,
      processed: startIdx + chunk.length,
      total: allContacts.length,
      batchSize: chunk.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
