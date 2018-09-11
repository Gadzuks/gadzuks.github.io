<?php
// Check for empty fields
if(empty($_POST['name']) || empty($_POST['email']) || !filter_var($_POST['email'],FILTER_VALIDATE_EMAIL)){
	echo json_encode(array('error'=>'true'));
	return false;
}

$name = $_POST['name'];
$email_address = $_POST['email'];
$message = $_POST['message'];

$subject = "Website Contact Form:  $name";



// Create the email and send the message
$to = 'test@gmail.com'; // Add your email address inbetween the '' replacing yourname@yourdomain.com - This is where the form will send a message to.
$email_body = "You have received a new message from your website contact form.\n\n"."Here are the details:\n\nFirst Name: $name\n\nEmail Address: $email_address\n\nMessage:\n\n$message";
$headers = "From: noreply@yourdomain.com\n"; // This is the email address the generated message will be from. We recommend using something like noreply@yourdomain.com.
$headers .= "Reply-To: $email_address";	
mail($to,$subject,$email_body,$headers);
echo json_encode(array('success'=>'true'));
return true;