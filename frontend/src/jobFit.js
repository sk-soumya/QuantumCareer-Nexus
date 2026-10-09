// CampusLink canonical Job Fit scorer.
// Deterministic: no AI/LLM/embedding model is used for the final percentage.

export const JOB_FIT_WEIGHTS = {
  skills: 0.75,
  cgpa: 0.25,
};

export function clamp(value, min, max) {
  var n = Number(value);
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

export function normalizeSkill(value) {
  return String(value == null ? "" : value)
    .trim()
    .toLowerCase()
    .replace(/[._/]+/g, " ")
    .replace(/\s+/g, " ");
}

export function splitSkills(value) {
  return String(value == null ? "" : value)
    .split(/[,|\n;]+/)
    .map(function (skill) {
      return normalizeSkill(skill);
    })
    .filter(function (skill) {
      return Boolean(skill);
    });
}

export function skillMatches(studentSkill, requiredSkill) {
  var a = normalizeSkill(studentSkill);
  var b = normalizeSkill(requiredSkill);

  if (!a || !b) return false;

  return a === b || a.indexOf(b) !== -1 || b.indexOf(a) !== -1;
}

function readNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  var n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function scoreSkills(requiredSkills, studentSkills) {
  var matchedSkills = [];

  requiredSkills.forEach(function (required) {
    var found = studentSkills.some(function (student) {
      return skillMatches(student, required);
    });

    if (found) {
      matchedSkills.push(required);
    }
  });

  var missingSkills = requiredSkills.filter(function (required) {
    return matchedSkills.indexOf(required) === -1;
  });

  var skillScore = requiredSkills.length
    ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
    : 75;

  return {
    matchedSkills: matchedSkills,
    missingSkills: missingSkills,
    skillScore: clamp(skillScore, 0, 100),
  };
}

export function calculateJobFit(job, profile) {
  job = job || {};
  profile = profile || {};

  var requiredSkills = splitSkills(job.required_skills);
  var studentSkills = splitSkills(profile.skills);

  var skill = scoreSkills(requiredSkills, studentSkills);

  var minimumCgpa = readNumber(job.minimum_cgpa);
  var studentCgpa = readNumber(profile.cgpa);

  var cgpaEligible =
    minimumCgpa === null ||
    (studentCgpa !== null && studentCgpa >= minimumCgpa);

  var cgpaScore = minimumCgpa === null ? 75 : cgpaEligible ? 100 : 0;

  var overallScore = Math.round(
    skill.skillScore * JOB_FIT_WEIGHTS.skills +
    cgpaScore * JOB_FIT_WEIGHTS.cgpa
  );

  return {
    overallScore: clamp(overallScore, 0, 100),
    skillScore: skill.skillScore,
    cgpaScore: cgpaScore,
    cgpaEligible: cgpaEligible,
    requiredSkills: requiredSkills,
    studentSkills: studentSkills,
    matchedSkills: skill.matchedSkills,
    missingSkills: skill.missingSkills,
    weights: JOB_FIT_WEIGHTS,
    method: "deterministic_v1",
    modelUsed: false,
  };
}

export function calculateCandidateJobFit(job, candidate) {
  job = job || {};
  candidate = candidate || {};

  var candidateSkills =
    candidate.skills ||
    candidate.student_skills ||
    candidate.profile_skills ||
    "";

  var candidateCgpa = readNumber(candidate.cgpa);

  if (candidateSkills) {
    return calculateJobFit(job, {
      skills: candidateSkills,
      cgpa: candidateCgpa,
    });
  }

  var requiredSkills = splitSkills(job.required_skills);

  var matchedSkills = Array.isArray(candidate.matched_skills)
    ? candidate.matched_skills
        .map(function (skill) {
          return normalizeSkill(skill);
        })
        .filter(function (skill) {
          return Boolean(skill);
        })
    : [];

  var missingSkills = Array.isArray(candidate.missing_skills)
    ? candidate.missing_skills
        .map(function (skill) {
          return normalizeSkill(skill);
        })
        .filter(function (skill) {
          return Boolean(skill);
        })
    : [];

  var denominator =
    requiredSkills.length ||
    matchedSkills.length + missingSkills.length;

  var skillScore = denominator
    ? Math.round((matchedSkills.length / denominator) * 100)
    : 75;

  var minimumCgpa = readNumber(job.minimum_cgpa);

  var cgpaEligible;

  if (minimumCgpa === null) {
    cgpaEligible = true;
  } else if (candidateCgpa !== null) {
    cgpaEligible = candidateCgpa >= minimumCgpa;
  } else {
    cgpaEligible =
      Boolean(candidate.is_eligible) ||
      Number(candidate.cgpa_score || 0) >= 100;
  }

  var cgpaScore = minimumCgpa === null ? 75 : cgpaEligible ? 100 : 0;

  var overallScore = Math.round(
    skillScore * JOB_FIT_WEIGHTS.skills +
    cgpaScore * JOB_FIT_WEIGHTS.cgpa
  );

  return {
    overallScore: clamp(overallScore, 0, 100),
    skillScore: clamp(skillScore, 0, 100),
    cgpaScore: cgpaScore,
    cgpaEligible: cgpaEligible,
    requiredSkills: requiredSkills,
    studentSkills: [],
    matchedSkills: matchedSkills,
    missingSkills: missingSkills,
    weights: JOB_FIT_WEIGHTS,
    method: "deterministic_v1_fallback",
    modelUsed: false,
  };
}