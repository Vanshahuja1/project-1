import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the caller
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is super admin
    const { data: superAdminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle()

    const isSuperAdmin = !!superAdminRole

    // Check if user is a vendor (master_vendor role)
    const { data: vendorRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'master_vendor')
      .maybeSingle()

    // Get vendor data if user is a vendor
    let callerVendorId = null
    if (vendorRole) {
      const { data: vendorData } = await supabaseAdmin
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      callerVendorId = vendorData?.id
    }

    // Must be either super admin or vendor
    if (!isSuperAdmin && !callerVendorId) {
      throw new Error('Unauthorized: Admin or Vendor access required')
    }

    const { 
      email, 
      password, 
      fullName, 
      role,
      vendorData,
      vendorId  // For staff assignment to a vendor
    } = await req.json()

    // If user is a vendor (not super admin), they can only create staff for themselves
    const targetVendorId = isSuperAdmin ? vendorId : callerVendorId

    console.log('Creating user:', { email, role, targetVendorId, isSuperAdmin })

    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    })

    if (createError) throw createError

    // Insert into user_roles
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role
      })

    if (roleError) throw roleError

    // If creating a vendor, insert vendor data
    if (vendorData) {
      const { error: vendorError } = await supabaseAdmin
        .from('vendors')
        .insert({
          user_id: newUser.user.id,
          ...vendorData
        })

      if (vendorError) throw vendorError
    }

    // If assigning staff to a vendor, create vendor_staff relationship
    if (targetVendorId && !vendorData) {
      const { error: staffError } = await supabaseAdmin
        .from('vendor_staff')
        .insert({
          vendor_id: targetVendorId,
          user_id: newUser.user.id,
          role: role
        })

      if (staffError) {
        console.error('Error creating vendor_staff:', staffError)
        // Don't throw - staff was still created, just not linked
      } else {
        console.log('Vendor staff relationship created:', { vendor_id: targetVendorId, user_id: newUser.user.id })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: newUser.user.id,
        email: newUser.user.email 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
