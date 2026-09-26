"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDashboardViewer } from "@/lib/dashboard/auth";
import {
  departmentBlockedMessage, isDepartmentEligible, isMemberDepartment,
  parseDepartmentOptions, type DepartmentOptions, type MemberDepartment,
} from "@/lib/dashboard/member-departments";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logServerError } from "@/lib/server-log";

export interface DepartmentChoiceState {
  message: string;
  options?: DepartmentOptions;
  department?: MemberDepartment;
}

export async function chooseMemberDepartment(
  _previous: DepartmentChoiceState,
  formData: FormData,
): Promise<DepartmentChoiceState> {
  const viewer = await getDashboardViewer();
  if (!viewer) redirect("/conta/login?next=/membru");
  if (!isDepartmentEligible(viewer.profile, viewer.roles)) {
    return { message: "Alegerea departamentului este disponibilă doar membrilor activi, cu excepția Board-ului și a Super Adminilor." };
  }
  const department = formData.get("department");
  if (!isMemberDepartment(department)) return { message: "Alege HR sau PR pentru a continua." };

  let savedDepartment: MemberDepartment;
  try {
    // The user ID comes from the verified session, never from the submitted form.
    const { data, error } = await supabaseAdmin.rpc("select_member_department", {
      p_profile_id: viewer.user.id,
      p_department: department,
    });
    if (error) throw error;
    const result = data && typeof data === "object" && !Array.isArray(data) ? data.result : null;
    if (result === "blocked") {
      const options = parseDepartmentOptions(data);
      if (!options?.blockedDepartment) throw new Error("Invalid department options");
      return { options, message: departmentBlockedMessage(options.blockedDepartment) };
    }
    if (result !== "selected" && result !== "already_selected") {
      return { message: "Departamentul nu a fost salvat. Reîncarcă pagina pentru a verifica accesul contului." };
    }
    const saved = data && typeof data === "object" && !Array.isArray(data) ? data.department : null;
    if (!isMemberDepartment(saved)) throw new Error("Invalid saved department");
    savedDepartment = saved;
  } catch (error) {
    logServerError("member_department_selection_failed", error);
    return { message: "Nu am putut salva departamentul. Încearcă din nou." };
  }
  revalidatePath("/", "layout");
  return { department: savedDepartment, message: `Departamentul ${savedDepartment.toUpperCase()} a fost salvat.` };
}
