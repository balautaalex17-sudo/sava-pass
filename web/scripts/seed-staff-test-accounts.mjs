import { createClient } from "@supabase/supabase-js";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const accounts = [
  {
    role: "admin",
    name: "Test Administrator",
    email: required("STAFF_TEST_ADMIN_EMAIL"),
    password: required("STAFF_TEST_ADMIN_PASSWORD"),
  },
  {
    role: "board",
    name: "Test Board",
    email: required("STAFF_TEST_BOARD_EMAIL"),
    password: required("STAFF_TEST_BOARD_PASSWORD"),
  },
  {
    role: "scanner",
    name: "Test Scanner",
    email: required("STAFF_TEST_SCANNER_EMAIL"),
    password: required("STAFF_TEST_SCANNER_PASSWORD"),
  },
  {
    role: "interviewer",
    name: "Test Intervievator",
    email: required("STAFF_TEST_INTERVIEWER_EMAIL"),
    password: required("STAFF_TEST_INTERVIEWER_PASSWORD"),
  },
];

const supabase = createClient(
  required("NEXT_PUBLIC_SUPABASE_URL"),
  required("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function findUser(email) {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
    );
    if (user) return user;
    if (data.users.length < 100) return null;
  }
  throw new Error("Could not finish searching Auth users");
}

for (const account of accounts) {
  let user = await findUser(account.email);

  if (user) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: account.password,
      email_confirm: true,
      user_metadata: {
        name: account.name,
        savapass_test_account: true,
      },
      app_metadata: {
        ...user.app_metadata,
        savapass_test_account: true,
      },
    });
    if (error || !data.user) throw error ?? new Error(`Could not update ${account.role}`);
    user = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        name: account.name,
        savapass_test_account: true,
      },
      app_metadata: {
        savapass_test_account: true,
      },
    });
    if (error || !data.user) throw error ?? new Error(`Could not create ${account.role}`);
    user = data.user;
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: account.name,
    email: account.email,
    role: account.role,
    membership_status: "active",
    grade: "TEST",
    updated_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;

  if (account.role === "scanner" || account.role === "interviewer") {
    const { error: roleError } = await supabase.from("profile_roles").upsert({
      profile_id: user.id,
      role: account.role,
      assigned_by: user.id,
    }, { onConflict: "profile_id,role" });
    if (roleError) throw roleError;
  }

  console.log(`${account.role}: ready (${account.email})`);
}
