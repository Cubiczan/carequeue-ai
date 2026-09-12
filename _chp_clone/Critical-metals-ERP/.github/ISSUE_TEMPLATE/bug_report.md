name: Bug Report
description: File a bug report
labels: ['bug', 'triage']
assignees: ''
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report!
        
        **Before submitting:**
        - Search existing issues to avoid duplicates
        - Check if the issue persists in the latest version
        - Gather relevant information (logs, screenshots, etc.)
  
  - type: textarea
    id: description
    attributes:
      label: Describe the bug
      description: A clear and concise description of what the bug is.
      placeholder: The application crashes when...
    validations:
      required: true
  
  - type: textarea
    id: reproduce
    attributes:
      label: To Reproduce
      description: Steps to reproduce the behavior.
      placeholder: |
        1. Go to '...'
        2. Click on '...'
        3. Scroll down to '...'
        4. See error
    validations:
      required: true
  
  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
      description: A clear and concise description of what you expected to happen.
      placeholder: I expected to see...
    validations:
      required: true
  
  - type: textarea
    id: actual
    attributes:
      label: Actual behavior
      description: What actually happened instead.
      placeholder: Instead, I saw...
    validations:
      required: true
  
  - type: dropdown
    id: severity
    attributes:
      label: Severity
      description: How severe is this bug?
      options:
        - Critical (application crash, data loss)
        - High (major functionality broken)
        - Medium (minor functionality broken)
        - Low (cosmetic issue, typo)
    validations:
      required: true
  
  - type: input
    id: version
    attributes:
      label: Battery ERP Version
      description: What version of Battery ERP are you using?
      placeholder: v1.0.0 or commit hash
    validations:
      required: true
  
  - type: input
    id: browser
    attributes:
      label: Browser & Environment
      description: Browser, OS, and Node.js version.
      placeholder: Chrome 114, macOS 13.4, Node 18.16
  
  - type: textarea
    id: logs
    attributes:
      label: Relevant logs
      description: Please copy and paste any relevant log output.
      render: shell
  
  - type: textarea
    id: additional
    attributes:
      label: Additional context
      description: Add any other context about the problem here.
  
  - type: checkboxes
    id: terms
    attributes:
      label: Code of Conduct
      description: By submitting this issue, you agree to follow our Code of Conduct.
      options:
        - label: I agree to follow the project's Code of Conduct
          required: true
