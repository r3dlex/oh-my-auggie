#!/bin/bash
export ANTHROPIC_AUTH_TOKEN="sk-cp-zcsWMVzxsXTyV4Kg_trT0LD3H28bvySjdpm9rhLD33T3_JDhb50--Pg7V5j6b1Z7w77K_yZakEYiD2AoROd6GphuRTdHbQB6CWh-kPG7Ii6x0LKVHU382vA"
export ANTHROPIC_BASE_URL="https://api.minimax.io/anthropic"
export ANTHROPIC_MODEL="MiniMax-M2.7"
exec claude --dangerously-skip-permissions "$@"
