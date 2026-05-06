/* eslint-disable react-refresh/only-export-components */
import { Dimensions, Platform } from 'react-native';
import { showMessage } from 'react-native-flash-message';

export const IS_IOS = Platform.OS === 'ios';
const { width, height } = Dimensions.get('screen');

export const WIDTH = width;
export const HEIGHT = height;

function getErrorResponseData(error: unknown): unknown {
  if (error !== null && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: unknown } }).response;
    return response?.data;
  }
  return undefined;
}

/** Shows a flash message; supports axios-like `{ response: { data } }` or `Error`. */
export function showError(error: unknown) {
  const responseData = getErrorResponseData(error);
  let description = 'Something went wrong ';
  if (responseData !== undefined) {
    console.log(JSON.stringify(responseData));
    description = extractError(responseData).trimEnd();
  }
  else if (error instanceof Error) {
    description = error.message;
  }

  showMessage({
    message: 'Error',
    description,
    type: 'danger',
    duration: 4000,
    icon: 'danger',
  });
}

export function showErrorMessage(message: string = 'Something went wrong ') {
  showMessage({
    message,
    type: 'danger',
    duration: 4000,
  });
}

export function extractError(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }
  if (Array.isArray(data)) {
    const messages = data.map((item) => {
      return `  ${extractError(item)}`;
    });

    return `${messages.join('')}`;
  }

  if (typeof data === 'object' && data !== null) {
    const messages = Object.entries(data).map((item) => {
      const [key, value] = item;
      const separator = Array.isArray(value) ? ':\n ' : ': ';

      return `- ${key}${separator}${extractError(value)} \n `;
    });
    return `${messages.join('')} `;
  }
  return 'Something went wrong ';
}
