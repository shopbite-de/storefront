import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import LoginForm from "@/components/User/LoginForm.vue";
import { ApiClientError } from "@shopware/api-client";

vi.mock("@shopware/api-client", () => ({
  ApiClientError: class extends Error {
    details: any;
    constructor(details: any) {
      super("ApiClientError");
      this.details = details;
    }
  },
}));

vi.mock("@shopware/composables", () => ({
  useUser: vi.fn(),
  useWishlist: vi.fn(),
}));

const mockToastAdd = vi.fn();
mockNuxtImport("useToast", () => {
  return () => ({
    add: mockToastAdd,
  });
});

const loginMock = vi.fn();
const userMock = ref({ firstName: "John", lastName: "Doe" });
const isLoggedInMock = ref(false);

mockNuxtImport("useUser", () => {
  return () => ({
    isLoggedIn: isLoggedInMock,
    login: loginMock,
    user: userMock,
  });
});

mockNuxtImport("useWishlist", () => {
  return () => ({
    mergeWishlistProducts: vi.fn(),
  });
});

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loginMock.mockReset();
    isLoggedInMock.value = false;
    userMock.value = { firstName: "John", lastName: "Doe" };
  });

  it("should show success toast on successful login", async () => {
    loginMock.mockResolvedValueOnce({});
    const wrapper = await mountSuspended(LoginForm);

    // Call onSubmit directly if form trigger is not working in test
    await (wrapper.vm as any).onSubmit({
      data: {
        email: "test@example.com",
        password: "password123",
      },
    });

    expect(loginMock).toHaveBeenCalledWith({
      username: "test@example.com",
      password: "password123",
    });

    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Hallo John Doe!",
        description: "Erfolgreich angemeldet.",
        color: "success",
      }),
    );
  });

  it("should show error toast on failed login", async () => {
    loginMock.mockRejectedValueOnce(new Error("Invalid credentials"));
    const wrapper = await mountSuspended(LoginForm);

    // Call onSubmit directly if form trigger is not working in test
    await (wrapper.vm as any).onSubmit({
      data: {
        email: "test@example.com",
        password: "wrongpassword",
      },
    });

    expect(loginMock).toHaveBeenCalled();

    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Login fehlgeschlagen",
        description: "Bitte überprüfen Sie Ihre Zugangsdaten.",
        color: "error",
      }),
    );
  });

  it("should show detailed error toast on ApiClientError", async () => {
    const apiClientError = new ApiClientError({
      errors: [
        {
          detail: 'The email address "test@example.com" is already in use',
        },
      ],
    });
    loginMock.mockRejectedValueOnce(apiClientError);
    const wrapper = await mountSuspended(LoginForm);

    await (wrapper.vm as any).onSubmit({
      data: {
        email: "test@example.com",
        password: "password123",
      },
    });

    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Login fehlgeschlagen",
        description: 'The email address "test@example.com" is already in use',
        color: "error",
      }),
    );
  });

  it("should handle ApiClientError with missing errors gracefully", async () => {
    const apiClientError = new ApiClientError({});
    loginMock.mockRejectedValueOnce(apiClientError);
    const wrapper = await mountSuspended(LoginForm);

    await (wrapper.vm as any).onSubmit({
      data: {
        email: "test@example.com",
        password: "password123",
      },
    });

    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Login fehlgeschlagen",
        description: "Bitte überprüfen Sie Ihre Zugangsdaten.",
        color: "error",
      }),
    );
  });
});
