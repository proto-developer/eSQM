import { createTransport } from "nodemailer";
import { renderFile } from "ejs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

var transporter = createTransport({
  host: "smtp.mail.ovh.net",
  port: 465,
  secure: true,
  auth: {
    user: "contact@euro-tas.eu",
    pass: "Contact23",
  },
});

export const sendInstallationLucieQMSMail = async (obj) => {
  var mailOptions = {
    from: "contact@euro-tas.com",
    to: obj.user_email,
    // bcc: ["mail1", "mail2"],
    subject: "Welcome to LUCIE SQM",
    // attachments: [
    //   {
    //     path: "./public/Lucie QMS Workflow_240723_161230.pdf",
    //   },
    // ],
  };

  let mail_data = {
    user_name: obj.user_name,
  };

  const template_path = join(
    __dirname,
    "../views/installation-lucie-SQM-mail.ejs"
  );
  renderFile(template_path, mail_data, function (error, html) {
    mailOptions.html = html;
  });

  const response = await transporter.sendMail(mailOptions);
  if (response) {
    return {
      status: 200,
      message: "Email sent successfully",
      response: response,
    };
  } else {
    console.log("Error in Email Sending: ", error);
  }
};
