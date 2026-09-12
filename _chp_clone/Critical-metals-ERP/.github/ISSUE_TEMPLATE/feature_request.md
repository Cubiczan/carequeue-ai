name: Feature Request
description: Suggest an idea for this project
labels: ['enhancement', 'triage']
assignees: ''
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to suggest a feature!
        
        **Before submitting:**
        - Search existing feature requests to avoid duplicates
        - Check if the feature already exists
        - Consider if this is truly a feature request vs. a bug report
  
  - type: textarea
    id: problem
    attributes:
      label: Is your feature request related to a problem?
      description: A clear and concise description of what the problem is.
      placeholder: I'm always frustrated when...
    validations:
      required: true
  
  - type: textarea
    id: solution
    attributes:
      label: Describe the solution you'd like
      description: A clear and concise description of what you want to happen.
      placeholder: I would like to see...
    validations:
      required: true
  
  - type: textarea
    id: alternatives
    attributes:
      label: Describe alternatives you've considered
      description: A clear and concise description of any alternative solutions or features you've considered.
      placeholder: I've also considered...
  
  - type: textarea
    id: use-cases
    attributes:
      label: Use cases
      description: Describe specific use cases where this feature would be helpful.
      placeholder: This would be useful for...
    validations:
      required: true
  
  - type: dropdown
    id: priority
    attributes:
      label: Priority
      description: How important is this feature to you?
      options:
        - Critical (cannot work without it)
        - High (would significantly improve workflow)
        - Medium (nice to have)
        - Low (minor improvement)
    validations:
      required: true
  
  - type: textarea
    id: mockups
    attributes:
      label: Mockups or examples
      description: If you have any mockups, screenshots, or examples of similar features, please share them.
  
  - type: textarea
    id: additional
    attributes:
      label: Additional context
      description: Add any other context about the feature request here.
  
  - type: checkboxes
    id: terms
    attributes:
      label: Code of Conduct
      description: By submitting this feature request, you agree to follow our Code of Conduct.
      options:
        - label: I agree to follow the project's Code of Conduct
          required: true
