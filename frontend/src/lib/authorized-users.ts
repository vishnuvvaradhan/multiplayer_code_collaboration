export interface AuthorizedUser {
  id: string;
  name: string;
  displayName: string;
  email: string;
  role?: string;
}

export const AUTHORIZED_USERS: AuthorizedUser[] = [
  {
    id: "eyal-shechtman",
    name: "Eyal Shechtman",
    displayName: "Eyal Shechtman",
    email: "eyal@company.com",
    role: "Product Manager"
  },
  {
    id: "vishnu-varadhan",
    name: "Vishnu Varadhan",
    displayName: "Vishnu Varadhan",
    email: "vishnu@company.com",
    role: "Developer"
  },
  {
    id: "pavan-kotti",
    name: "Pavan Kotti",
    displayName: "Pavan Kotti",
    email: "pavan@company.com",
    role: "Developer"
  }
];

// Helper function to get all authorized user names
export const getAuthorizedUserNames = (): string[] => {
  return AUTHORIZED_USERS.map(user => user.displayName);
};

// Helper function to check if a user is authorized
export const isAuthorizedUser = (displayName: string): boolean => {
  return AUTHORIZED_USERS.some(user => user.displayName === displayName);
};
