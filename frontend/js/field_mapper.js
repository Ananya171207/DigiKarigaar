/**
 * Converts the answers returned by voice_flow.js into values
 * matching the field IDs in karigar_form_schema.json.
 *
 * @param {Object} answers
 * @param {Object} formSchema
 * @returns {Object}
 */
export function mapAnswersToFields(answers, formSchema) {
  const mappedFields = {};
  const allFields = getAllFields(formSchema);

  allFields.forEach((field) => {
    const answer = answers[field.field_id];

    if (answer === undefined || answer === null) {
      if (field.default_value !== undefined) {
        mappedFields[field.field_id] = field.default_value;
      }

      return;
    }

    mappedFields[field.field_id] = normalizeValue(
      answer,
      field
    );
  });

  return mappedFields;
}


/**
 * Extracts all fields from every section of the schema.
 */
function getAllFields(formSchema) {
  if (!formSchema || !Array.isArray(formSchema.sections)) {
    return [];
  }

  return formSchema.sections.flatMap(
    (section) => section.fields || []
  );
}


/**
 * Normalizes an answer according to the field type.
 */
function normalizeValue(answer, field) {
  switch (field.type) {
    case "number":
      return normalizeNumber(answer);

    case "tel":
      return normalizePhoneNumber(answer);

    case "radio":
    case "checkbox":
      return normalizeBoolean(answer);

    case "multiselect":
      return normalizeMultipleValues(answer, field.options);

    case "select":
      return normalizeSelectValue(answer, field.options);

    case "date":
      return normalizeDate(answer);

    default:
      return String(answer).trim();
  }
}


/**
 * Converts spoken or typed numbers into JavaScript numbers.
 */
function normalizeNumber(answer) {
  if (typeof answer === "number") {
    return answer;
  }

  const cleanedAnswer = String(answer)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/[^0-9.-]/g, "");

  if (cleanedAnswer === "") {
    return null;
  }

  const number = Number(cleanedAnswer);

  return Number.isNaN(number) ? null : number;
}


/**
 * Removes spaces and symbols from a mobile number.
 */
function normalizePhoneNumber(answer) {
  return convertDigitWords(String(answer))
    .replace(/\D/g, "")
    .slice(-10);
}


/**
 * Converts common Hindi and English digit words.
 */
function convertDigitWords(answer) {
  const digitWords = {
    zero: "0", one: "1", two: "2", three: "3", four: "4",
    five: "5", six: "6", seven: "7", eight: "8", nine: "9",
    शून्य: "0", जीरो: "0", एक: "1", दो: "2", तीन: "3",
    चार: "4", पांच: "5", पाँच: "5", छह: "6", सात: "7",
    आठ: "8", नौ: "9",
    শূন্য: "0", জিরো: "0", এক: "1", দুই: "2", তিন: "3",
    চার: "4", পাঁচ: "5", ছয়: "6", সাত: "7", আট: "8", নয়: "9",
    பூஜ்ஜியம்: "0", சுழியம்: "0", ஒன்று: "1", இரண்டு: "2",
    மூன்று: "3", நான்கு: "4", ஐந்து: "5", ஆறு: "6",
    ஏழு: "7", எட்டு: "8", ஒன்பது: "9"
  };

  const nativeDigits = {
    "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
    "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
    "௦": "0", "௧": "1", "௨": "2", "௩": "3", "௪": "4",
    "௫": "5", "௬": "6", "௭": "7", "௮": "8", "௯": "9"
  };

  return String(answer)
    .toLowerCase()
    .replace(/[০-৯௦-௯]/g, digit => nativeDigits[digit])
    .split(/\s+/)
    .map(word => digitWords[word] ?? word)
    .join("");
}

/**
 * Converts yes/no answers into true or false.
 */
function normalizeBoolean(answer) {
  if (typeof answer === "boolean") return answer;

  const normalizedAnswer = String(answer).trim().toLowerCase();
  const positiveAnswers = [
    "yes", "true", "haan", "ha", "हाँ", "हां", "जी हाँ",
    "सही", "स्वीकार", "হ্যাঁ", "হ্যা", "সত্য", "সম্মত",
    "ஆம்", "ஆமாம்", "உண்மை", "ஏற்கிறேன்"
  ];
  const negativeAnswers = [
    "no", "false", "nahi", "nahin", "नहीं", "नही", "ना",
    "না", "নয়", "মিথ্যা", "இல்லை", "வேண்டாம்", "தவறு"
  ];

  if (positiveAnswers.includes(normalizedAnswer)) return true;
  if (negativeAnswers.includes(normalizedAnswer)) return false;
  return null;
}

/**
 * Matches spoken answers with a dropdown option.
 */
function normalizeSelectValue(answer, options = []) {
  const normalizedAnswer = String(answer).trim().toLowerCase();

  const matchedOption = options.find(option => {
    const candidates = [
      option.value,
      option.label,
      option.label_hi,
      option.label_bn,
      option.label_ta
    ]
      .filter(value => value !== undefined && value !== null)
      .map(value => String(value).trim().toLowerCase())
      .filter(Boolean);

    return candidates.some(candidate =>
      normalizedAnswer === candidate || normalizedAnswer.includes(candidate)
    );
  });

  return matchedOption ? matchedOption.value : String(answer).trim();
}

/**
 * Normalizes multiple selected options.
 */
function normalizeMultipleValues(answer, options = []) {
  const answers = Array.isArray(answer)
    ? answer
    : String(answer).split(",");

  return answers
    .map((item) => normalizeSelectValue(item, options))
    .filter(Boolean);
}


/**
 * Converts supported dates into YYYY-MM-DD format.
 */
function normalizeDate(answer) {
  const date = new Date(answer);

  if (Number.isNaN(date.getTime())) {
    return String(answer).trim();
  }

  return date.toISOString().split("T")[0];
}
/**
 * Places mapped values into the matching replica-form inputs.
 *
 * HTML input id/name must match the schema field_id.
 */
export function fillFormFields(mappedFields) {
  Object.entries(mappedFields).forEach(
    ([fieldId, value]) => {
      const elements = document.querySelectorAll(
        `[name="${fieldId}"], #${fieldId}`
      );

      if (elements.length === 0) {
        console.warn(`Form field not found: ${fieldId}`);
        return;
      }

      elements.forEach((element) => {
        if (element.type === "file") {
          return;
        }
        if (element.type === "radio") {
          element.checked =
            String(element.value) === String(value);
        } else if (element.type === "checkbox") {
          if (Array.isArray(value)) {
            element.checked = value.includes(element.value);
          } else {
            element.checked = Boolean(value);
          }
        } else {
          element.value = value ?? "";
        }

        element.dispatchEvent(
          new Event("input", { bubbles: true })
        );

        element.dispatchEvent(
          new Event("change", { bubbles: true })
        );
      });
    }
  );
}
/**
 * Checks whether a field or section should be displayed.
 */
export function shouldShowItem(
  item,
  currentAnswers
) {
  if (!item.show_when) {
    return true;
  }

  const controllingField =
    item.show_when.field_id;

  const requiredValue =
    item.show_when.equals;

  const currentValue =
    currentAnswers[controllingField];

  return String(currentValue) === String(requiredValue);
}


/**
 * Returns only the sections and fields that are currently
 * applicable based on previous answers.
 */
export function getVisibleFormSchema(
  formSchema,
  currentAnswers
) {
  const visibleSections =
    formSchema.sections
      .filter((section) =>
        shouldShowItem(
          section,
          currentAnswers
        )
      )
      .map((section) => ({
        ...section,

        fields: section.fields.filter(
          (field) =>
            shouldShowItem(
              field,
              currentAnswers
            )
        )
      }));

  return {
    ...formSchema,
    sections: visibleSections
  };
}
/**
 * Validates mapped answers using the active schema fields.
 */
export function validateFormAnswers(
  mappedFields,
  formSchema
) {
  const visibleSchema =
    getVisibleFormSchema(
      formSchema,
      mappedFields
    );

  const fields =
    visibleSchema.sections.flatMap(
      (section) => section.fields || []
    );

  const errors = {};

  fields.forEach((field) => {
    const value =
      mappedFields[field.field_id];

    const isEmpty =
      value === undefined ||
      value === null ||
      value === "" ||
      (
        Array.isArray(value) &&
        value.length === 0
      );

    if (field.required && isEmpty) {
      errors[field.field_id] =
        `${field.label} is required.`;

      return;
    }

    if (
      !isEmpty &&
      field.validation?.pattern
    ) {
      const pattern = new RegExp(
        field.validation.pattern
      );

      if (!pattern.test(String(value))) {
        errors[field.field_id] =
          field.validation.message ||
          `Invalid ${field.label}.`;
      }
    }

    if (
      field.matches_field &&
      value !==
      mappedFields[field.matches_field]
    ) {
      errors[field.field_id] =
        `${field.label} does not match.`;
    }

    if (
      field.type === "number" &&
      !isEmpty
    ) {
      const numberValue = Number(value);

      if (
        field.minimum !== undefined &&
        numberValue < field.minimum
      ) {
        errors[field.field_id] =
          `${field.label} is below the minimum value.`;
      }

      if (
        field.maximum !== undefined &&
        numberValue > field.maximum
      ) {
        errors[field.field_id] =
          `${field.label} exceeds the maximum value.`;
      }
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}