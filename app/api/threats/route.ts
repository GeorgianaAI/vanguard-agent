import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedKey = process.env.INTERNAL_API_KEY; 

  // Handshake Verification
  if (!authHeader || authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: 'Unauthorized Handshake' }, { status: 401 });
  }

  // Tactical Threat Data (Mock for now, to be wired to database in next task)
  const threats = [
    { 
      id: 'v-101', 
      type: 'CLOUD', 
      severity: 'HIGH', 
      label: 'Suspicious IP', 
      detail: '192.168.1.50 detected on ALB' 
    },
    { 
      id: 'v-102', 
      type: 'CVE', 
      severity: 'CRITICAL', 
      label: 'Log4j Variant', 
      detail: 'RCE vulnerability detected in Production' 
    }
  ];

  return NextResponse.json(threats);
}
