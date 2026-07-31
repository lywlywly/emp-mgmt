import { Button } from "@/components/ui/button";
import {
  ProfileDetails,
  ProfileField as Field,
  ProfileSection,
  SaveButton,
} from "@/features/profile/ProfilePrimitives";
import {
  ProfilePhotoPicker,
  type ProfilePhoto,
} from "@/features/onboarding/ProfilePhotoPicker";
import { fileDownloadUrl, uploadFile } from "@/lib/files";
import { queryClient, trpc } from "@/lib/trpc";
import type {
  EmployeeProfile,
  EmployeeProfileUpdateSectionInput,
} from "@emp-mgmt/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";

type Section =
  "name" | "address" | "contact" | "employment" | "emergencyContact";

function textValue(values: FormData, name: string) {
  return String(values.get(name) ?? "").trim();
}

function ProfileEditor({ profile }: { profile: EmployeeProfile }) {
  const [editing, setEditing] = useState<Section | null>(null);
  const [selectedProfilePhoto, setSelectedProfilePhoto] = useState<{
    file: File;
    fileName: string;
    previewUrl: string;
    sourceUrl: string;
  } | null>(null);
  const [isUsCitizenOrPermanentResident, setIsUsCitizenOrPermanentResident] =
    useState(profile.data.workAuthorization.isUsCitizenOrPermanentResident);
  const [emergencyContactCount, setEmergencyContactCount] = useState(
    profile.data.emergencyContacts.length,
  );
  const updateProfile = useMutation(
    trpc.profile.updateSection.mutationOptions({
      onSuccess: () => {
        setEditing(null);
        setSelectedProfilePhoto(null);
        void queryClient.invalidateQueries({
          queryKey: trpc.profile.getMine.queryKey(),
        });
      },
    }),
  );

  function startEditing(section: Section) {
    if (section === "employment") {
      setIsUsCitizenOrPermanentResident(
        profile.data.workAuthorization.isUsCitizenOrPermanentResident,
      );
    }
    if (section === "emergencyContact") {
      setEmergencyContactCount(profile.data.emergencyContacts.length);
    }
    setEditing(section);
  }

  function save(input: EmployeeProfileUpdateSectionInput) {
    updateProfile.mutate(input);
  }

  async function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const profilePictureId = selectedProfilePhoto
      ? (await uploadFile(selectedProfilePhoto.file)).id
      : undefined;
    save({
      section: "name",
      firstName: textValue(values, "firstName"),
      middleName: textValue(values, "middleName"),
      lastName: textValue(values, "lastName"),
      preferredName: textValue(values, "preferredName"),
      profilePictureId,
      ssn: textValue(values, "ssn"),
      dateOfBirth: textValue(values, "dateOfBirth"),
      gender: textValue(values, "gender") as "male" | "female" | "decline",
    });
  }

  function submitAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    save({
      section: "address",
      address: {
        buildingOrApt: textValue(values, "buildingOrApt"),
        street: textValue(values, "street"),
        city: textValue(values, "city"),
        state: textValue(values, "state").toUpperCase(),
        zipCode: textValue(values, "zipCode"),
      },
    });
  }

  function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    save({
      section: "contact",
      cellPhone: textValue(values, "cellPhone"),
      workPhone: textValue(values, "workPhone"),
    });
  }

  function submitEmployment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);

    if (isUsCitizenOrPermanentResident) {
      save({
        section: "employment",
        workAuthorization: {
          isUsCitizenOrPermanentResident: true,
          residentOrCitizenType: textValue(values, "residentOrCitizenType") as
            "citizen" | "green_card",
          type: null,
          otherType: "",
          startDate: "",
          endDate: "",
        },
      });
      return;
    }

    save({
      section: "employment",
      workAuthorization: {
        isUsCitizenOrPermanentResident: false,
        residentOrCitizenType: null,
        type: textValue(values, "type") as "h1b" | "l2" | "f1" | "h4" | "other",
        otherType: textValue(values, "otherType"),
        startDate: textValue(values, "startDate"),
        endDate: textValue(values, "endDate"),
      },
    });
  }

  function submitEmergencyContacts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    save({
      section: "emergencyContact",
      emergencyContacts: Array.from(
        { length: emergencyContactCount },
        (_, index) => ({
          firstName: textValue(values, `firstName-${index}`),
          middleName: textValue(values, `middleName-${index}`),
          lastName: textValue(values, `lastName-${index}`),
          phone: textValue(values, `phone-${index}`),
          email: textValue(values, `email-${index}`),
          relationship: textValue(values, `relationship-${index}`),
        }),
      ),
    });
  }

  const {
    address,
    contact,
    emergencyContacts,
    name,
    personalDetails,
    workAuthorization,
  } = profile.data;
  const savedProfilePhoto = profile.data.documents.find(
    (document) => document.kind === "profile_photo",
  );
  const profilePhoto: ProfilePhoto | undefined = selectedProfilePhoto
    ? selectedProfilePhoto
    : savedProfilePhoto && {
        fileName: savedProfilePhoto.fileName,
        sourceUrl: fileDownloadUrl(savedProfilePhoto.id),
      };

  return (
    <div className="space-y-4">
      <ProfileSection
        editing={editing === "name"}
        onCancel={() => setEditing(null)}
        onEdit={() => startEditing("name")}
        onSubmit={submitName}
        title="Personal information"
      >
        {editing === "name" ? (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Profile picture</p>
              <ProfilePhotoPicker
                onChange={setSelectedProfilePhoto}
                photo={profilePhoto}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                defaultValue={name.firstName}
                label="First name"
                name="firstName"
                required
              />
              <Field
                defaultValue={name.lastName}
                label="Last name"
                name="lastName"
                required
              />
              <Field
                defaultValue={name.middleName}
                label="Middle name"
                name="middleName"
              />
              <Field
                defaultValue={name.preferredName}
                label="Preferred name"
                name="preferredName"
              />
              <Field
                defaultValue={personalDetails.ssn}
                label="SSN"
                name="ssn"
                required
              />
              <Field
                defaultValue={personalDetails.dateOfBirth}
                label="Date of birth"
                name="dateOfBirth"
                required
                type="date"
              />
              <label className="text-sm font-medium">
                Gender <span className="text-destructive">*</span>
                <select
                  className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  defaultValue={personalDetails.gender}
                  name="gender"
                  required
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="decline">I do not wish to answer</option>
                </select>
              </label>
            </div>
            <SaveButton pending={updateProfile.isPending} />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="grid size-16 shrink-0 overflow-hidden rounded-full bg-muted text-muted-foreground">
                {profilePhoto ? (
                  <img
                    alt="Profile photo"
                    className="size-full object-cover"
                    src={profilePhoto.sourceUrl}
                  />
                ) : (
                  <UserRound
                    aria-hidden="true"
                    className="place-self-center size-6"
                  />
                )}
              </div>
            </div>
            <ProfileDetails
              values={[
                [
                  "Name",
                  [name.firstName, name.middleName, name.lastName]
                    .filter(Boolean)
                    .join(" "),
                ],
                ["Preferred name", name.preferredName || "—"],
                ["Date of birth", personalDetails.dateOfBirth],
                [
                  "Gender",
                  personalDetails.gender === "decline"
                    ? "Prefer not to say"
                    : personalDetails.gender,
                ],
              ]}
            />
          </div>
        )}
      </ProfileSection>

      <ProfileSection
        editing={editing === "address"}
        onCancel={() => setEditing(null)}
        onEdit={() => startEditing("address")}
        onSubmit={submitAddress}
        title="Address"
      >
        {editing === "address" ? (
          <div className="space-y-4">
            <Field
              defaultValue={address.buildingOrApt}
              label="Building or apartment"
              name="buildingOrApt"
            />
            <Field
              defaultValue={address.street}
              label="Street"
              name="street"
              required
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                defaultValue={address.city}
                label="City"
                name="city"
                required
              />
              <Field
                defaultValue={address.state}
                label="State"
                name="state"
                required
              />
              <Field
                defaultValue={address.zipCode}
                label="ZIP code"
                name="zipCode"
                required
              />
            </div>
            <SaveButton pending={updateProfile.isPending} />
          </div>
        ) : (
          <ProfileDetails
            values={[
              [
                "Address",
                [
                  address.buildingOrApt,
                  address.street,
                  address.city,
                  address.state,
                  address.zipCode,
                ]
                  .filter(Boolean)
                  .join(", "),
              ],
            ]}
          />
        )}
      </ProfileSection>

      <ProfileSection
        editing={editing === "contact"}
        onCancel={() => setEditing(null)}
        onEdit={() => startEditing("contact")}
        onSubmit={submitContact}
        title="Contact"
      >
        {editing === "contact" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your invitation email cannot be changed.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                defaultValue={contact.cellPhone}
                label="Cell phone"
                name="cellPhone"
                required
              />
              <Field
                defaultValue={contact.workPhone}
                label="Work phone"
                name="workPhone"
              />
            </div>
            <SaveButton pending={updateProfile.isPending} />
          </div>
        ) : (
          <ProfileDetails
            values={[
              ["Email", contact.email],
              ["Cell phone", contact.cellPhone],
              ["Work phone", contact.workPhone || "—"],
            ]}
          />
        )}
      </ProfileSection>

      <ProfileSection
        editing={editing === "employment"}
        onCancel={() => setEditing(null)}
        onEdit={() => startEditing("employment")}
        onSubmit={submitEmployment}
        title="Work authorization"
      >
        {editing === "employment" ? (
          <div className="space-y-4 text-sm">
            <div className="flex gap-5">
              <label>
                <input
                  checked={isUsCitizenOrPermanentResident}
                  name="us-status"
                  onChange={() => setIsUsCitizenOrPermanentResident(true)}
                  type="radio"
                />{" "}
                U.S. citizen or permanent resident
              </label>
              <label>
                <input
                  checked={!isUsCitizenOrPermanentResident}
                  name="us-status"
                  onChange={() => setIsUsCitizenOrPermanentResident(false)}
                  type="radio"
                />{" "}
                Other work authorization
              </label>
            </div>
            {isUsCitizenOrPermanentResident ? (
              <label className="block text-sm font-medium">
                Status
                <select
                  className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  defaultValue={
                    workAuthorization.residentOrCitizenType ?? "citizen"
                  }
                  name="residentOrCitizenType"
                >
                  <option value="citizen">Citizen</option>
                  <option value="green_card">Green Card</option>
                </select>
              </label>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Authorization type
                  <select
                    className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    defaultValue={workAuthorization.type ?? "h1b"}
                    name="type"
                  >
                    <option value="h1b">H-1B</option>
                    <option value="l2">L-2</option>
                    <option value="f1">F-1 (CPT/OPT)</option>
                    <option value="h4">H-4</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <Field
                  defaultValue={workAuthorization.otherType}
                  label="Other visa title"
                  name="otherType"
                />
                <Field
                  defaultValue={workAuthorization.startDate}
                  label="Start date"
                  name="startDate"
                  required
                  type="date"
                />
                <Field
                  defaultValue={workAuthorization.endDate}
                  label="End date"
                  name="endDate"
                  required
                  type="date"
                />
              </div>
            )}
            <SaveButton pending={updateProfile.isPending} />
          </div>
        ) : (
          <ProfileDetails
            values={
              workAuthorization.isUsCitizenOrPermanentResident
                ? [
                    [
                      "Status",
                      workAuthorization.residentOrCitizenType === "green_card"
                        ? "Green Card"
                        : "Citizen",
                    ],
                  ]
                : [
                    [
                      "Authorization",
                      workAuthorization.type?.toUpperCase() ?? "—",
                    ],
                    [
                      "Valid dates",
                      `${workAuthorization.startDate} to ${workAuthorization.endDate}`,
                    ],
                  ]
            }
          />
        )}
      </ProfileSection>

      <ProfileSection
        editing={editing === "emergencyContact"}
        onCancel={() => setEditing(null)}
        onEdit={() => startEditing("emergencyContact")}
        onSubmit={submitEmergencyContacts}
        title="Emergency contacts"
      >
        {editing === "emergencyContact" ? (
          <div className="space-y-5">
            {Array.from({ length: emergencyContactCount }, (_, index) => {
              const person = emergencyContacts[index];
              return (
                <div
                  className="grid gap-4 border-b pb-5 last:border-0 last:pb-0 sm:grid-cols-2"
                  key={index}
                >
                  <Field
                    defaultValue={person?.firstName ?? ""}
                    label="First name"
                    name={`firstName-${index}`}
                    required
                  />
                  <Field
                    defaultValue={person?.lastName ?? ""}
                    label="Last name"
                    name={`lastName-${index}`}
                    required
                  />
                  <Field
                    defaultValue={person?.middleName ?? ""}
                    label="Middle name"
                    name={`middleName-${index}`}
                  />
                  <Field
                    defaultValue={person?.relationship ?? ""}
                    label="Relationship"
                    name={`relationship-${index}`}
                    required
                  />
                  <Field
                    defaultValue={person?.phone ?? ""}
                    label="Phone"
                    name={`phone-${index}`}
                  />
                  <Field
                    defaultValue={person?.email ?? ""}
                    label="Email"
                    name={`email-${index}`}
                    type="email"
                  />
                </div>
              );
            })}
            <div className="flex items-center justify-between gap-3">
              <Button
                onClick={() => setEmergencyContactCount((count) => count + 1)}
                type="button"
                variant="outline"
              >
                Add contact
              </Button>
              <SaveButton pending={updateProfile.isPending} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {emergencyContacts.map((person, index) => (
              <ProfileDetails
                key={`${person.email}-${index}`}
                values={[
                  [
                    `${person.firstName} ${person.lastName}`,
                    `${person.relationship} · ${person.phone || person.email || "No contact details"}`,
                  ],
                ]}
              />
            ))}
          </div>
        )}
      </ProfileSection>

      {updateProfile.isError && (
        <p className="text-sm text-destructive" role="alert">
          {updateProfile.error.message}
        </p>
      )}
    </div>
  );
}

export default function EmployeeProfile() {
  const query = useQuery(trpc.profile.getMine.queryOptions());

  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Employee portal</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">My profile</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Review and update your information.
        </p>
      </div>
      {query.isPending ? (
        <div className="h-96 animate-pulse rounded-lg border bg-muted/40" />
      ) : query.isError ? (
        <p className="text-sm text-destructive">{query.error.message}</p>
      ) : query.data ? (
        <ProfileEditor profile={query.data} />
      ) : (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          Your profile will appear after onboarding approval.
        </div>
      )}
    </section>
  );
}
