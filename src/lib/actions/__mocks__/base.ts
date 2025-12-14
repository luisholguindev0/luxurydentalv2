export const getOrgId = jest.fn()
export const revalidatePaths = jest.fn()
export const handleActionError = (error: unknown) => ({ success: false, error: String(error) })
