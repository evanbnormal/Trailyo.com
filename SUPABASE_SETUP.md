# Supabase Setup Guide for Trail Blaze

## 1. Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and sign in to your account
2. Create a new project or select an existing one
3. Go to **Settings** → **API** in your project dashboard
4. Copy the following values:
   - **Project URL** (this is your `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public** key (this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **service_role** key (this is your `SUPABASE_SERVICE_ROLE_KEY` - keep this secret!)

## 2. Set Up Environment Variables

1. Create a `.env.local` file in your project root
2. Add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## 3. Set Up Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase-migration.sql`
4. Paste it into the SQL editor and run it

This will create:
- `trails` table for storing learning trails
- `trail_steps` table for individual steps in each trail
- `analytics_events` table for tracking user interactions
- `user_progress` table for tracking user progress
- Row Level Security (RLS) policies for data protection
- Sample data to get you started

## 4. Configure Authentication (Optional)

If you want to use Supabase's built-in authentication:

1. Go to **Authentication** → **Settings** in your Supabase dashboard
2. Configure your authentication providers (Email, Google, GitHub, etc.)
3. Set up email templates if using email authentication

## 5. Test Your Setup

1. Start your development server: `npm run dev`
2. Try creating a trail or viewing analytics
3. Check the browser console and network tab for any errors

## 6. What's Now Available

With Supabase integrated, your app now has:

✅ **Persistent Data Storage** - All trails, steps, and analytics are stored in a real database
✅ **User Authentication** - Secure user registration and login
✅ **Row Level Security** - Users can only access their own data
✅ **Real-time Features** - Can be enabled for live updates
✅ **Scalable Backend** - No more in-memory storage limitations

## 7. Next Steps

- Customize the database schema if needed
- Add more authentication providers
- Set up real-time subscriptions for live updates
- Configure backup and monitoring
- Deploy to production

## Troubleshooting

**Error: "Missing Supabase environment variables"**
- Make sure your `.env.local` file exists and has the correct values
- Restart your development server after adding environment variables

**Error: "Failed to fetch trails"**
- Check that the database schema was created correctly
- Verify your Supabase URL and API key are correct

**Authentication not working**
- Check that Row Level Security policies are set up correctly
- Verify your authentication settings in the Supabase dashboard 