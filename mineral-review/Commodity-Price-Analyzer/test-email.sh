#!/bin/bash
# Send test email using swaks (SMTP Swiss Army Knife)

echo "Testing email configuration for zan@impactquadrant.info"
echo "Sending to: sam@cubiczan.com"

swaks --to sam@cubiczan.com \
      --from zan@impactquadrant.info \
      --server smtp.gmail.com:587 \
      --tls \
      --auth-user zan@impactquadrant.info \
      --auth-password "cqma sflq nsfv itke" \
      --header "Subject: Test Email from OpenClaw" \
      --body "Hello! This is a test email from OpenClaw. If you received this, email is configured correctly!" 2>&1
