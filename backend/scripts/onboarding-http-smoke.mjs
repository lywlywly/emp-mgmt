/**
 * Exercises the employee onboarding and HR approval flow through HTTP.
 *
 * Start the backend first, then run:
 *   $env:EMPLOYEE_USERNAME = "..."
 *   $env:EMPLOYEE_PASSWORD = "..."
 *   $env:HR_USERNAME = "..."
 *   $env:HR_PASSWORD = "..."
 *   pnpm --filter emp-mgmt-backend test:http
 *
 * Optional: API_BASE_URL=http://localhost:4001 pnpm --filter emp-mgmt-backend test:http
 *
 * This script expects the supplied employee to have no onboarding application.
 * It creates and approves an application; run it only against development data.
 */

const baseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";

function requiredEnvironmentVariable(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} before running this script.`);
  return value;
}

const employeeCredentials = {
  username: requiredEnvironmentVariable("EMPLOYEE_USERNAME"),
  password: requiredEnvironmentVariable("EMPLOYEE_PASSWORD"),
};

const hrCredentials = {
  username: requiredEnvironmentVariable("HR_USERNAME"),
  password: requiredEnvironmentVariable("HR_PASSWORD"),
};

function getSessionCookie(response) {
  const setCookies = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie")];
  const sessionCookie = setCookies.find((cookie) => cookie?.startsWith("connect.sid="));

  if (!sessionCookie) {
    throw new Error("Login succeeded without returning a connect.sid cookie.");
  }

  return sessionCookie.split(";", 1)[0];
}

function errorMessage(body) {
  return body?.error?.message ?? "Unknown tRPC error.";
}

async function trpcRequest(procedure, { cookie, input, method = "GET" } = {}) {
  const url = new URL(`/trpc/${procedure}`, baseUrl);
  const headers = {};

  if (cookie) headers.Cookie = cookie;

  const options = { method, headers };
  if (method === "GET") {
    if (input !== undefined) {
      url.searchParams.set("input", JSON.stringify(input));
    }
  } else {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(input);
  }

  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`${procedure} failed (${response.status}): ${errorMessage(body)}`);
  }

  return { data: body?.result?.data, response };
}

async function login(credentials) {
  const { response } = await trpcRequest("auth.login", {
    input: credentials,
    method: "POST",
  });
  return getSessionCookie(response);
}

const applicationInput = {
  name: {
    firstName: "Test",
    middleName: "",
    lastName: "Employee",
    preferredName: "",
  },
  address: {
    buildingOrApt: "",
    street: "100 Market Street",
    city: "San Francisco",
    state: "CA",
    zipCode: "94105",
  },
  contact: {
    cellPhone: "415-555-0137",
    workPhone: "",
  },
  personalDetails: {
    ssn: "000-00-0000",
    dateOfBirth: "1990-01-01",
    gender: "decline",
  },
  workAuthorization: {
    isUsCitizenOrPermanentResident: true,
    residentOrCitizenType: "citizen",
    type: null,
    otherType: "",
    startDate: "",
    endDate: "",
  },
  reference: {
    firstName: "",
    middleName: "",
    lastName: "",
    phone: "",
    email: "",
    relationship: "",
  },
  emergencyContacts: [
    {
      firstName: "Casey",
      middleName: "",
      lastName: "Employee",
      phone: "415-555-0199",
      email: "casey.employee@example.com",
      relationship: "Sibling",
    },
  ],
  documents: [],
};

async function main() {
  console.log(`Using API at ${baseUrl}`);

  console.log("1. Signing in as the employee...");
  const employeeCookie = await login(employeeCredentials);

  console.log("2. Confirming the employee has no onboarding application...");
  const { data: existingApplication } = await trpcRequest("onboarding.getMine", {
    cookie: employeeCookie,
  });
  if (existingApplication !== null) {
    throw new Error(
      "Expected no onboarding application. Delete or reject the existing application before running this script.",
    );
  }

  console.log("3. Submitting the employee onboarding application...");
  const { data: submittedApplication } = await trpcRequest("onboarding.submit", {
    cookie: employeeCookie,
    input: applicationInput,
    method: "POST",
  });
  const applicationId = submittedApplication?.id;
  if (!applicationId) throw new Error("Submission did not return an application id.");

  console.log("4. Signing in as HR...");
  const hrCookie = await login(hrCredentials);

  console.log("5. Verifying the application appears in HR's pending queue...");
  const { data: pendingApplications } = await trpcRequest("onboarding.listByStatus", {
    cookie: hrCookie,
    input: { status: "pending" },
  });
  if (!pendingApplications?.some((application) => application.id === applicationId)) {
    throw new Error("The submitted application was not found in the pending queue.");
  }

  console.log("6. Approving the application as HR...");
  await trpcRequest("onboarding.review", {
    cookie: hrCookie,
    input: { id: applicationId, decision: "approve" },
    method: "POST",
  });

  console.log("7. Verifying the employee profile was created...");
  const { data: profile } = await trpcRequest("profile.getMine", {
    cookie: employeeCookie,
  });
  if (!profile?.id) throw new Error("Approval did not create an employee profile.");

  console.log("PASS: employee onboarding was submitted and approved over HTTP.");
}

main().catch((error) => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
