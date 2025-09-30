import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const clientes = {
  ifood: {
    subdomain: "vitaconsupport",
    email: "consultoriazendesk@bcrcx.com",
    token: process.env.ZENDESK_VITACON_TOKEN,
  },
  fau: {
    subdomain: "con-bcrcx-fabio",
    email: "consultoriazendesk@bcrcx.com",
    token: process.env.ZENDESK_FAU_TOKEN,
  },
  leticia: {
    subdomain: "con-bcrcx-leticia",
    email: "consultoriazendesk@bcrcx.com",
    token: process.env.ZENDESK_LETICIA_TOKEN, //QHSvFVoPYJQCt8csJFXajoGSge8cFRACOksV808t

  }
};

export async function getUsers(cliente) {
  const cfg = clientes[cliente];
  if (!cfg) throw new Error("Cliente não configurado");

  if (!cfg.token) {
    throw new Error(`Token não definido para o cliente: ${cliente}`);
  }

  const url = `https://${cfg.subdomain}.zendesk.com/api/v2/users.json`;

  try {
    const response = await axios.get(url, {
      auth: {
        username: `${cfg.email}/token`,
        password: cfg.token
      }
    });
    return response.data;
  } catch (error) {
    console.error("Erro no getUsers:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error || error.message);
  }
}
